## Black Rabbit Landscaping

**Clean native React (Vite) + FastAPI + Grok Voice + Weather**

### Getting API Keys (Required)

#### 1. Grok / xAI API (Voice + Text)
- Go to https://console.x.ai/
- Sign up (email, Google, or X login)
- Complete onboarding
- Go to API Keys (https://console.x.ai/team/default/api-keys)
- Click "Create API Key"
- Copy the key (starts with xai-...)
- Add payment method if needed for production use
- Paste into backend/.env as XAI_API_KEY

Voice pricing example: ~$0.05/min realtime, very affordable to start.

#### 2. Weather API (Recommended: OpenWeatherMap)
- Go to https://home.openweathermap.org/users/sign_up
- Create free account
- Get API key from https://home.openweathermap.org/api_keys
- Paste into backend/.env as OPENWEATHER_API_KEY
- Free tier is very generous (1M calls/month)

### Quick Start

See previous README section for running backend and frontend.

Weather will show automatically when you pick a location on the map.
Voice features require the XAI key.

### .env setup
Copy .env.example and fill in your keys.