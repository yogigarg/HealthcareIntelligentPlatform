#!/usr/bin/env python3
import sys
import os
import argparse
import traceback

print("Starting Healthcare MCP Server...")
print(f"Python version: {sys.version}")
print(f"Current working directory: {os.getcwd()}")
print(f"Python path: {sys.path}")

try:
    from dotenv import load_dotenv
    print("✓ Successfully imported dotenv")
except ImportError as e:
    print(f"✗ Failed to import dotenv: {e}")
    print("Try: pip install python-dotenv")
    sys.exit(1)

# Load environment variables
try:
    load_dotenv()
    print("✓ Successfully loaded environment variables")
except Exception as e:
    print(f"✗ Failed to load environment variables: {e}")

if __name__ == "__main__":
    try:
        parser = argparse.ArgumentParser(description="Healthcare MCP Server")
        parser.add_argument("--http", action="store_true", help="Run in HTTP mode")
        parser.add_argument("--port", type=int, default=int(os.getenv("PORT", "8000")), help="Port for HTTP server")
        parser.add_argument("--host", type=str, default=os.getenv("HOST", "0.0.0.0"), help="Host for HTTP server")
        args = parser.parse_args()

        print(f"Arguments parsed: http={args.http}, port={args.port}, host={args.host}")

        if args.http:
            # Run in HTTP mode (for web clients)
            print("Attempting to import server components...")
            
            try:
                from src.server import app
                print("✓ Successfully imported src.server.app")
            except ImportError as e:
                print(f"✗ Failed to import src.server: {e}")
                print("Make sure src/server.py exists and has an 'app' variable")
                traceback.print_exc()
                sys.exit(1)
            
            try:
                import uvicorn
                print("✓ Successfully imported uvicorn")
            except ImportError as e:
                print(f"✗ Failed to import uvicorn: {e}")
                print("Try: pip install uvicorn")
                sys.exit(1)

            print(f"Starting HTTP server on {args.host}:{args.port}...")
            try:
                uvicorn.run(app, host=args.host, port=args.port, reload=False, access_log=True)
            except Exception as e:
                print(f"✗ Failed to start HTTP server: {e}")
                traceback.print_exc()
                sys.exit(1)
        else:
            # Run in stdio mode (for Cline)
            print("Attempting to import MCP components...")
            
            try:
                from src.main import mcp
                print("✓ Successfully imported src.main.mcp")
            except ImportError as e:
                print(f"✗ Failed to import src.main: {e}")
                print("Make sure src/main.py exists and has an 'mcp' variable")
                traceback.print_exc()
                sys.exit(1)

            print("Starting MCP server in stdio mode...")
            try:
                sys.exit(mcp.run())
            except Exception as e:
                print(f"✗ Failed to start MCP server: {e}")
                traceback.print_exc()
                sys.exit(1)
                
    except Exception as e:
        print(f"✗ Unexpected error: {e}")
        traceback.print_exc()
        input("Press Enter to continue...")  # Keep window open on Windows
        sys.exit(1)