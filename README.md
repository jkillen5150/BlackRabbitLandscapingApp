## Black Rabbit Landscaping

**Clean native React + FastAPI + Grok Voice + Weather**

### Important: API Keys Required

You mentioned you need to purchase the Grok Voice API.

**Grok Voice API (xAI):**
1. Go to https://console.x.ai/
2. Sign up or log in
3. Go to 'API Keys' section
4. Create a new key
5. Add a payment method / buy credits (Voice is usage-based: ~$0.05/min realtime)
6. Copy the key (xai-...)

**Weather API (recommended):**
- OpenWeatherMap (free tier is generous for this app)
- Sign up at https://home.openweathermap.org/users/sign_up
- Get key from API keys page

Add both to backend/.env

### Run

See instructions in previous commits or run:
- Backend: uvicorn main:app --reload
- Frontend: npm run dev

Voice features and weather are built in on the clean-start branch.