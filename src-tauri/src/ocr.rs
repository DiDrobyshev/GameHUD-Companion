#[cfg(windows)]
pub fn run_windows_ocr(image_bytes: &[u8]) -> Result<String, String> {
    use windows::Media::Ocr::OcrEngine;
    use windows::Storage::Streams::{DataWriter, InMemoryRandomAccessStream};
    use windows::Graphics::Imaging::BitmapDecoder;

    let engine = OcrEngine::TryCreateFromUserProfileLanguages()
        .map_err(|e| format!("Failed to create OcrEngine from user profile languages: {e}"))?;

    let stream = InMemoryRandomAccessStream::new()
        .map_err(|e| format!("Failed to create InMemoryRandomAccessStream: {e}"))?;

    let writer = DataWriter::CreateDataWriter(&stream)
        .map_err(|e| format!("Failed to create DataWriter: {e}"))?;

    writer.WriteBytes(image_bytes)
        .map_err(|e| format!("Failed to write bytes to stream: {e}"))?;

    writer.StoreAsync()
        .map_err(|e| format!("Failed to start StoreAsync: {e}"))?
        .get()
        .map_err(|e| format!("StoreAsync failed: {e}"))?;

    writer.FlushAsync()
        .map_err(|e| format!("Failed to start FlushAsync: {e}"))?
        .get()
        .map_err(|e| format!("FlushAsync failed: {e}"))?;

    stream.Seek(0)
        .map_err(|e| format!("Failed to seek stream: {e}"))?;

    let decoder = BitmapDecoder::CreateAsync(&stream)
        .map_err(|e| format!("Failed to start BitmapDecoder::CreateAsync: {e}"))?
        .get()
        .map_err(|e| format!("BitmapDecoder::CreateAsync failed: {e}"))?;

    let software_bitmap = decoder.GetSoftwareBitmapAsync()
        .map_err(|e| format!("Failed to start GetSoftwareBitmapAsync: {e}"))?
        .get()
        .map_err(|e| format!("GetSoftwareBitmapAsync failed: {e}"))?;

    let ocr_result = engine.RecognizeAsync(&software_bitmap)
        .map_err(|e| format!("Failed to start RecognizeAsync: {e}"))?
        .get()
        .map_err(|e| format!("RecognizeAsync failed: {e}"))?;

    let text = ocr_result.Text()
        .map_err(|e| format!("Failed to read OCR text: {e}"))?
        .to_string();

    Ok(text)
}

#[cfg(not(windows))]
pub fn run_windows_ocr(_image_bytes: &[u8]) -> Result<String, String> {
    Err("Windows OCR is only supported on Windows".to_string())
}
