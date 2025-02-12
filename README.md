# Claude MCP Server

This project implements a server adhering to the Model Context Protocol (MCP), providing a standardized way to integrate AI tools and models. It supports multiple AI providers (OpenAI, Anthropic, and Google) and offers a range of built-in tools for code analysis, web interaction, and more.

## Features

* **MCP Compliance:** Designed to work with MCP clients, enabling seamless tool integration.
* **Multi-Provider Support:** Utilizes OpenAI, Anthropic, and Google's Gemini models. Configure the default provider and API keys via environment variables.
* **Extensible Tooling:** Includes a framework for easily adding and managing custom tools. Current tools include:
  * Code Generation (`llm_code_generate`)
  * Web Requests (`web_request`)
  * Web Scraping (`web_scrape`)
  * Code Analysis (`code_analyze`)
  * Code Documentation (`code_document`)
  * Code Improvement Suggestions (`code_improve`)
* **Node.js and Python Servers:** Includes both Node.js (primary) and Python (FastAPI) server implementations.
* **Containerization:** Docker support for easy deployment and development.
* **Testing:** Integrated with Jest (JavaScript) and pytest (Python) for comprehensive testing.
* **Linting and Formatting:** Uses ESLint and Prettier to maintain code quality.

## Project Structure

```
.
├── config/             # Configuration files
│   ├── .env           # Environment variables (example provided)
│   ├── dockerfile     # Docker configuration
│   └── docker-compose.yaml
├── src/                # Source code
│   ├── api/           # FastAPI server (Python)
│   ├── core/          # Core MCP logic (Python)
│   ├── server/        # Node.js server implementations
│   ├── tools/         # Individual tool implementations (JavaScript)
│   └── utils/         # Utility functions (JavaScript)
├── tests/              # Test files
└── data/               # Data directory (used by Python server)
    └── monitoring/     # Performance monitoring data
```

## Setup and Installation

1. **Clone the repository:**

    ```bash
    git clone <repository_url>
    cd claude-mcp-server
    ```

2. **Environment Variables:**

    Create a `.env` file in the `claude-mcp-server` directory (and optionally in `config/`) by copying the `.env.example` file:

    ```bash
    cp .env.example .env
    ```

    Then, fill in your API keys for OpenAI, Anthropic, and Google:

    ```bash
    # .env
    NODE_ENV=development
    PORT=3000
    DEFAULT_AI_PROVIDER=anthropic  # or openai, google
    OPENAI_API_KEY=your-openai-key
    ANTHROPIC_API_KEY=your-anthropic-key
    GOOGLE_API_KEY=your-google-api-key
    ```

3. **Node.js Server (Recommended):**

    * **Install Dependencies:**

        ```bash
        npm install
        ```

    * **Run in Development Mode:**

        ```bash
        npm run dev  # Uses simple-server.js
        # OR
        npm run dev:custom # Uses custom-server.js
        ```
        The `--watch` flag automatically restarts the server on code changes.

    * **Run in Production Mode:**

        ```bash
        npm start # Uses simple-server.js
        ```

    * **Run Tests:**

        ```bash
        npm test
        npm run test:watch  # Watch mode
        npm run test:coverage # Generate coverage report
        ```

    * **Linting and Formatting:**

        ```bash
        npm run lint
        npm run lint:fix  # Automatically fix linting errors
        npm run format
        npm run format:check
        ```

4. **Python Server (FastAPI):**

    * **Install Dependencies (from claude-mcp-server directory):**
        ```bash
        pip install -r config/requirements.txt
        ```
    * **Run the Server:**
        ```bash
        npm run start:python
        ```
    * **Note:** The Python server might be less actively maintained than the Node.js server.

## Docker Usage

Docker is the recommended way to run the `claude-mcp-server`, especially for production deployments. It provides a consistent and isolated environment.

1. **Create a `.dockerignore` file (Recommended):**

    Create a file named `.dockerignore` in the `claude-mcp-server` directory with the following content:

    ```
    node_modules
    .git
    .DS_Store
    npm-debug.log
    Dockerfile
    docker-compose.yaml
    .env
    tests/
    ```

2. **Build the Docker Image:**

    ```bash
    npm run docker:build
    # or, equivalently:
    # docker-compose build
    ```

3. **Run the Container (Development Mode - with Hot Reloading):**

    ```bash
    npm run docker:run:dev
    # or, equivalently:
    # docker-compose -f config/docker-compose.yaml up --build
    ```

    This command uses the `config/docker-compose.yaml` file to:
    * Build the image (if it hasn't been built already or if changes are detected).
    * Start a container named `claude-mcp-server`.
    * Map port 3000 on your host machine to port 3000 inside the container.
    * Mount the `src`, `data`, and `config` directories as volumes. This means that any changes you make to these directories on your host machine will be immediately reflected inside the running container, allowing for hot-reloading during development.

4. **Run the Container (Production Mode):**

    ```bash
    npm run docker:run
    # or, equivalently:
    # docker-compose up
    ```

    This command starts the container *without* mounting the local directories as volumes. This is suitable for production because the container will use the code and configuration that were baked into the image during the build process.

5. **Running the Python Server Inside the Docker Container:**

    Even though the Node.js server is the default entry point, you can still run the Python server within the running Docker container:
    * **Get a Shell Inside the Container:**

        ```bash
        docker exec -it claude-mcp-server /bin/bash
        ```

        This command opens an interactive bash shell inside the running `claude-mcp-server` container.

    * **Run the Python Server:**

        ```bash
        python src/api/server.py
        ```

        The Python server will run on port 8000 *inside* the container. To access it from your host, either adjust `docker-compose.yaml` to expose port 8000 or use `curl` from within the container.

6. **Stopping the Container:**

    ```bash
    docker-compose down
    ```

## Usage

Once the server is running (either Node.js or Python), you can interact with it via MCP-compliant clients. The server exposes tools that can be invoked using a JSON-RPC 2.0 protocol. The specific tool names and parameters are defined within the `src/tools` directory (for the Node.js server) and `src/core/mcp_tools.py` (for the Python server). Refer to `howTO.md` for available tools.

## Contributing

See the main `mcp-projects/README.md` for general contributing guidelines.

## License

MIT License