#[cfg(windows)]
pub mod win_capture {
    use std::io::Cursor;
    use windows::Win32::Foundation::POINT;
    use windows::Win32::Graphics::Gdi::{
        BitBlt, CreateCompatibleBitmap, CreateCompatibleDC, DeleteDC, DeleteObject, GetDC,
        GetDIBits, ReleaseDC, SelectObject, BITMAPINFO, BITMAPINFOHEADER, BI_RGB, DIB_RGB_COLORS,
        SRCCOPY,
    };
    use windows::Win32::UI::WindowsAndMessaging::{
        GetCursorPos, GetSystemMetrics, SM_CXSCREEN, SM_CYSCREEN, SM_CXVIRTUALSCREEN,
        SM_CYVIRTUALSCREEN, SM_XVIRTUALSCREEN, SM_YVIRTUALSCREEN,
    };
    use image::{ImageBuffer, Rgba};

    pub fn get_cursor_pos() -> Result<(i32, i32), String> {
        let mut pt = POINT { x: 0, y: 0 };
        unsafe {
            GetCursorPos(&mut pt).map_err(|e| format!("Failed to get cursor position: {e}"))?;
        }
        Ok((pt.x, pt.y))
    }

    pub fn capture_rect(x: i32, y: i32, width: u32, height: u32) -> Result<Vec<u8>, String> {
        if width == 0 || height == 0 {
            return Err("Width and height must be greater than zero".to_string());
        }

        unsafe {
            let hdc_screen = GetDC(None);
            if hdc_screen.is_invalid() {
                return Err("Failed to GetDC(None)".to_string());
            }

            let hdc_mem = CreateCompatibleDC(Some(hdc_screen));
            if hdc_mem.is_invalid() {
                ReleaseDC(None, hdc_screen);
                return Err("Failed to CreateCompatibleDC".to_string());
            }

            let hbm = CreateCompatibleBitmap(hdc_screen, width as i32, height as i32);
            if hbm.is_invalid() {
                let _ = DeleteDC(hdc_mem);
                ReleaseDC(None, hdc_screen);
                return Err("Failed to CreateCompatibleBitmap".to_string());
            }

            let old_obj = SelectObject(hdc_mem, hbm.into());

            let blt_res = BitBlt(
                hdc_mem,
                0,
                0,
                width as i32,
                height as i32,
                Some(hdc_screen),
                x,
                y,
                SRCCOPY,
            );

            if let Err(e) = blt_res {
                SelectObject(hdc_mem, old_obj);
                let _ = DeleteObject(hbm.into());
                let _ = DeleteDC(hdc_mem);
                ReleaseDC(None, hdc_screen);
                return Err(format!("BitBlt failed: {e}"));
            }

            let mut bmi = BITMAPINFO {
                bmiHeader: BITMAPINFOHEADER {
                    biSize: std::mem::size_of::<BITMAPINFOHEADER>() as u32,
                    biWidth: width as i32,
                    biHeight: -(height as i32), // Top-down DIB
                    biPlanes: 1,
                    biBitCount: 32,
                    biCompression: BI_RGB.0,
                    biSizeImage: 0,
                    biXPelsPerMeter: 0,
                    biYPelsPerMeter: 0,
                    biClrUsed: 0,
                    biClrImportant: 0,
                },
                bmiColors: [windows::Win32::Graphics::Gdi::RGBQUAD {
                    rgbBlue: 0,
                    rgbGreen: 0,
                    rgbRed: 0,
                    rgbReserved: 0,
                }],
            };

            let mut bgra_buf: Vec<u8> = vec![0u8; (width * height * 4) as usize];

            let lines_copied = GetDIBits(
                hdc_mem,
                hbm,
                0,
                height,
                Some(bgra_buf.as_mut_ptr() as *mut _),
                &mut bmi,
                DIB_RGB_COLORS,
            );

            // Cleanup GDI objects
            SelectObject(hdc_mem, old_obj);
            let _ = DeleteObject(hbm.into());
            let _ = DeleteDC(hdc_mem);
            ReleaseDC(None, hdc_screen);

            if lines_copied == 0 {
                return Err("GetDIBits failed to copy any lines".to_string());
            }

            // Convert BGRA to RGBA
            let mut rgba_buf: Vec<u8> = vec![0u8; (width * height * 4) as usize];
            for i in 0..(width * height) as usize {
                let b = bgra_buf[i * 4];
                let g = bgra_buf[i * 4 + 1];
                let r = bgra_buf[i * 4 + 2];
                rgba_buf[i * 4] = r;
                rgba_buf[i * 4 + 1] = g;
                rgba_buf[i * 4 + 2] = b;
                rgba_buf[i * 4 + 3] = 255; // Alpha
            }

            // Encode to PNG using image crate
            let img: ImageBuffer<Rgba<u8>, Vec<u8>> =
                ImageBuffer::from_raw(width, height, rgba_buf)
                    .ok_or_else(|| "Failed to construct ImageBuffer".to_string())?;

            let mut png_bytes = Cursor::new(Vec::new());
            img.write_to(&mut png_bytes, image::ImageFormat::Png)
                .map_err(|e| format!("Failed to encode image as PNG: {e}"))?;

            Ok(png_bytes.into_inner())
        }
    }

    pub fn capture_cursor_area(width: u32, height: u32) -> Result<Vec<u8>, String> {
        let (cx, cy) = get_cursor_pos()?;
        // Center or offset near cursor (e.g. 500x350 box starting near cursor)
        let x = (cx - 20).max(0);
        let y = (cy - 20).max(0);
        capture_rect(x, y, width, height)
    }

    pub fn capture_screen_full() -> Result<Vec<u8>, String> {
        unsafe {
            let mut x = GetSystemMetrics(SM_XVIRTUALSCREEN);
            let mut y = GetSystemMetrics(SM_YVIRTUALSCREEN);
            let mut w = GetSystemMetrics(SM_CXVIRTUALSCREEN);
            let mut h = GetSystemMetrics(SM_CYVIRTUALSCREEN);

            if w <= 0 || h <= 0 {
                x = 0;
                y = 0;
                w = GetSystemMetrics(SM_CXSCREEN);
                h = GetSystemMetrics(SM_CYSCREEN);
            }

            capture_rect(x, y, w as u32, h as u32)
        }
    }
}

#[cfg(not(windows))]
pub mod win_capture {
    pub fn get_cursor_pos() -> Result<(i32, i32), String> {
        Ok((0, 0))
    }
    pub fn capture_cursor_area(_width: u32, _height: u32) -> Result<Vec<u8>, String> {
        Err("Screen capture only implemented on Windows".to_string())
    }
    pub fn capture_screen_full() -> Result<Vec<u8>, String> {
        Err("Screen capture only implemented on Windows".to_string())
    }
}
