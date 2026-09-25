use serde_json::Value;

pub async fn fetch_html_cors_bypass(url: &str) -> Result<String, String> {
    let client = reqwest::Client::builder()
        .user_agent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36")
        .build()
        .map_err(|e| format!("Failed to create HTTP client: {e}"))?;

    let resp = client.get(url)
        .send()
        .await
        .map_err(|e| format!("Request failed: {e}"))?;

    if !resp.status().is_success() {
        return Err(format!("HTTP error {}: {}", resp.status(), resp.status().canonical_reason().unwrap_or("Unknown")));
    }

    let html = resp.text().await
        .map_err(|e| format!("Failed to read response body: {e}"))?;

    Ok(html)
}

pub async fn translate_text(text: &str, sl: &str, tl: &str) -> Result<String, String> {
    if text.trim().is_empty() {
        return Ok(String::new());
    }

    let client = reqwest::Client::builder()
        .user_agent("Mozilla/5.0 (Windows NT 10.0; Win64; x64)")
        .build()
        .map_err(|e| format!("Failed to build HTTP client: {e}"))?;

    let encoded_text = urlencoding::encode(text);
    let sl_param = if sl.is_empty() { "auto" } else { sl };
    let tl_param = if tl.is_empty() { "ru" } else { tl };

    let url = format!(
        "https://translate.googleapis.com/translate_a/single?client=gtx&sl={sl_param}&tl={tl_param}&dt=t&q={encoded_text}"
    );

    let resp = client.get(&url)
        .send()
        .await
        .map_err(|e| format!("Translation request failed: {e}"))?;

    let json: Value = resp.json().await
        .map_err(|e| format!("Failed to parse translation response JSON: {e}"))?;

    // Parse Google Translate response format: [[["translated_segment", "source_segment", ...], ...], ...]
    let mut translated_full = String::new();
    if let Some(sentences) = json.get(0).and_then(|v| v.as_array()) {
        for sentence in sentences {
            if let Some(part) = sentence.get(0).and_then(|s| s.as_str()) {
                translated_full.push_str(part);
            }
        }
    }

    if translated_full.is_empty() {
        // Fallback: try to see if single string returned
        if let Some(s) = json.as_str() {
            return Ok(s.to_string());
        }
    }

    Ok(translated_full)
}

mod urlencoding {
    pub fn encode(data: &str) -> String {
        let mut result = String::new();
        for b in data.bytes() {
            match b {
                b'a'..=b'z' | b'A'..=b'Z' | b'0'..=b'9' | b'-' | b'_' | b'.' | b'~' => {
                    result.push(b as char);
                }
                _ => {
                    result.push_str(&format!("%{:02X}", b));
                }
            }
        }
        result
    }
}
