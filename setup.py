"""
cli-anything-obshare - Upload Markdown documents to Feishu
"""

from setuptools import setup, find_packages

with open("README.md", encoding="utf-8") as f:
    long_description = f.read()

setup(
    name="cli-anything-obshare",
    version="0.1.0",
    author="SuShuHeng",
    description="CLI tool for uploading Markdown documents to Feishu cloud documents",
    long_description=long_description,
    long_description_content_type="text/markdown",
    url="https://github.com/SuShuHeng/cli-anything-obshare",
    project_urls={
        "Bug Tracker": "https://github.com/SuShuHeng/cli-anything-obshare/issues",
        "Source Code": "https://github.com/SuShuHeng/cli-anything-obshare",
    },
    package_dir={"": "src"},
    packages=find_packages(where="src"),
    classifiers=[
        "Development Status :: 4 - Beta",
        "Intended Audience :: Developers",
        "License :: OSI Approved :: MIT License",
        "Operating System :: OS Independent",
        "Programming Language :: Python :: 3",
        "Programming Language :: Python :: 3.8",
        "Programming Language :: Python :: 3.9",
        "Programming Language :: Python :: 3.10",
        "Programming Language :: Python :: 3.11",
        "Programming Language :: Python :: 3.12",
        "Topic :: Office/Business",
        "Topic :: Text Processing :: Markup :: Markdown",
        "Topic :: Utilities",
    ],
    python_requires=">=3.8",
    install_requires=[
        "click>=8.0.0",
        "requests>=2.28.0",
        "cryptography>=3.4.0",
        "python-dotenv>=0.19.0",
        "pyyaml>=6.0",
        "pillow>=9.0.0",
    ],
    extras_require={
        "dev": [
            "pytest>=7.0.0",
            "pytest-cov>=4.0.0",
            "black>=23.0.0",
            "flake8>=6.0.0",
            "mypy>=1.0.0",
        ],
    },
    entry_points={
        "console_scripts": [
            "obshare-cli=obshare_cli.cli:main",
        ],
    },
    keywords="feishu markdown obsidian cli upload document",
    license="MIT",
)
