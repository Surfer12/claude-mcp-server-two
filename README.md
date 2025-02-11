# MCP Server

A powerful server implementation that combines multiple AI providers (OpenAI and Anthropic) with code analysis capabilities.

## Project Structure

```
.
├── config/             # Configuration files
│   ├── .env           # Environment variables
│   ├── dockerfile     # Docker configuration
│   ├── docker-compose.yaml
│   └── requirements.txt
├── src/               # Source code
│   ├── api/          # API endpoints
│   ├── core/         # Core functionality
│   ├── utils/        # Utility functions
│   ├── static/       # Static files
│   └── templates/    # HTML templates
├── tests/            # Test files
└── data/             # Data directory
    └── monitoring/   # Performance monitoring data
```

## Features

- Multi-provider support (OpenAI and Anthropic)
- Code generation and analysis
- Performance monitoring and visualization
- Modern web dashboard
- Authentication and authorization
- Docker support

## Setup

1. Clone the repository
2. Configure environment variables in `config/.env`:
   ```
   SECRET_KEY=your-secret-key-here
   ADMIN_PASSWORD=your-admin-password
   OPENAI_API_KEY=your-openai-key
   ANTHROPIC_API_KEY=your-anthropic-key
   PORT=3000
   ```

3. Build and run with Docker:
   ```bash
   cd config
   docker-compose up --build
   ```

4. Access the dashboard at `http://localhost:3000`

## API Endpoints

- `/` - Dashboard interface
- `/generate` - Code generation endpoint
- `/analyze` - Code analysis endpoint
- `/metrics` - Performance metrics
- `/health` - Health check endpoint

## Authentication

The server uses JWT-based authentication. Default credentials:
- Username: admin
- Password: admin (change this in production)

## Development

1. Create a virtual environment:
   ```bash
   python -m venv venv
   source venv/bin/activate  # Linux/Mac
   # or
   .\venv\Scripts\activate  # Windows
   ```

2. Install dependencies:
   ```bash
   pip install -r config/requirements.txt
   ```

3. Run the server:
   ```bash
   python src/api/server.py
   ```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

MIT License