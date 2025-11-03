"""
MITM Proxy Mock Script for Gemini Dialogue Extraction API

This script intercepts requests to the Gemini API (gemini-2.5-flash model)
and returns mock dialogue extraction responses.

Usage:
    mitmproxy -s mock_gemini_dialogue.py
    or
    mitmdump -s mock_gemini_dialogue.py
"""

import json
import re
from mitmproxy import http


# Sample mock responses for different script types
MOCK_RESPONSES = {
    "english_drama": {
        "language": "en",
        "dialogues": [
            {
                "character": "John",
                "dialogue": "I can't believe this is happening!",
                "deliveryNote": "(shocked)",
                "gender": "male"
            },
            {
                "character": "Mary",
                "dialogue": "We have to stay calm and think this through.",
                "deliveryNote": "(reassuring)",
                "gender": "female"
            },
            {
                "character": "John",
                "dialogue": "You're right. Let's figure this out together.",
                "deliveryNote": "(determined)",
                "gender": "male"
            }
        ]
    },
    "urdu_drama": {
        "language": "ur",
        "dialogues": [
            {
                "character": "احمد",
                "dialogue": "یہ کیا ہو رہا ہے؟",
                "deliveryNote": "(confused)",
                "gender": "male"
            },
            {
                "character": "فاطمہ",
                "dialogue": "صبر کریں، سب ٹھیک ہو جائے گا۔",
                "deliveryNote": "(calmly)",
                "gender": "female"
            }
        ]
    },
    "default": {
        "language": "en",
        "dialogues": [
            {
                "character": "Character A",
                "dialogue": "This is a sample dialogue.",
                "deliveryNote": "(neutral)",
                "gender": "neutral"
            },
            {
                "character": "Character B",
                "dialogue": "This is another sample dialogue.",
                "deliveryNote": "(neutral)",
                "gender": "neutral"
            }
        ]
    }
}


def detect_script_type(script_content: str) -> str:
    """
    Detect the type of script based on content.
    Returns the key for MOCK_RESPONSES.
    """
    script_lower = script_content.lower()
    
    # Check for Urdu characters
    if re.search(r'[\u0600-\u06FF]', script_content):
        return "urdu_drama"
    
    # Check for common drama keywords
    if any(word in script_lower for word in ['int.', 'ext.', 'fade in', 'scene']):
        return "english_drama"
    
    return "default"


def extract_script_from_request(request_content: dict) -> str:
    """
    Extract the script text from the Gemini API request.
    """
    try:
        contents = request_content.get("contents", "")
        if isinstance(contents, str):
            return contents
        
        # Handle structured content format
        if isinstance(contents, list) and len(contents) > 0:
            parts = contents[0].get("parts", [])
            if isinstance(parts, list) and len(parts) > 0:
                return parts[0].get("text", "")
        
        return ""
    except Exception as e:
        print(f"Error extracting script: {e}")
        return ""


def request(flow: http.HTTPFlow) -> None:
    """
    Intercept requests to Gemini API and return mock responses for dialogue extraction.
    """
    # Check if this is a Gemini API request for the flash model
    # Handle both direct calls and proxied calls through Vite
    is_gemini_api = (
        "generativelanguage.googleapis.com" in flow.request.pretty_host or
        "/v1beta/models/gemini-2.5-flash:generateContent" in flow.request.path or
        "gemini-2.5-flash" in flow.request.path
    )
    
    if is_gemini_api:
        
        print(f"[MOCK] Intercepted Gemini dialogue extraction request")
        print(f"[MOCK] URL: {flow.request.pretty_url}")
        
        try:
            # Parse the request body
            request_data = json.loads(flow.request.content.decode('utf-8'))
            
            # Extract script content
            script_content = extract_script_from_request(request_data)
            print(f"[MOCK] Script preview: {script_content[:100]}...")
            
            # Detect script type and get appropriate mock response
            script_type = detect_script_type(script_content)
            mock_data = MOCK_RESPONSES.get(script_type, MOCK_RESPONSES["default"])
            
            print(f"[MOCK] Using mock response type: {script_type}")
            print(f"[MOCK] Language: {mock_data['language']}, Dialogues: {len(mock_data['dialogues'])}")
            
            # Create mock response
            response_body = json.dumps({
                "candidates": [
                    {
                        "content": {
                            "parts": [
                                {
                                    "text": json.dumps(mock_data)
                                }
                            ],
                            "role": "model"
                        },
                        "finishReason": "STOP",
                        "index": 0,
                        "safetyRatings": []
                    }
                ],
                "usageMetadata": {
                    "promptTokenCount": 100,
                    "candidatesTokenCount": 50,
                    "totalTokenCount": 150
                }
            })
            
            # Create the mock response
            flow.response = http.Response.make(
                200,
                response_body.encode('utf-8'),
                {
                    "Content-Type": "application/json",
                    "Access-Control-Allow-Origin": "*"
                }
            )
            
            print(f"[MOCK] Returned mock dialogue extraction response")
            
        except Exception as e:
            print(f"[MOCK] Error processing request: {e}")
            # Return error response
            error_response = json.dumps({
                "error": {
                    "code": 500,
                    "message": f"Mock error: {str(e)}",
                    "status": "INTERNAL"
                }
            })
            flow.response = http.Response.make(
                500,
                error_response.encode('utf-8'),
                {"Content-Type": "application/json"}
            )
