# No backend, client-side AI configuration

This app has no backend and no database. AI features (both local models like Ollama and cloud providers) are called directly from the browser using configuration the user enters themselves, stored only in their own browser. Chosen over the more common backend-proxy pattern to keep zero hosting cost, zero data liability, and no path toward accidentally collecting user data. Trade-off: no key protection, rate-limiting, or usage analytics — those are explicitly not goals.
