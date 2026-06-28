<div align="center">

# Aegis

[![Build Status](https://img.shields.io/badge/build-passing-brightgreen)](#)
[![License](https://img.shields.io/badge/license-ISC-blue)](#)
[![Version](https://img.shields.io/badge/version-1.0.0-blue)](#)

**Aegis is an Inclusive Language Linter that analyzes written documents (Markdown, MDX, HTML, Plain Text) to detect insensitive, biased, or profane language and suggests neutral alternatives.**

</div>

---

## 📑 Table of Contents
- [About the Project](#about-the-project)
- [Key Features](#key-features)
- [Built With](#built-with)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
- [Usage](#usage)
- [Contributing](#contributing)
- [License](#license)
- [Contact](#contact)

---

## 📖 About the Project

Aegis is a modern, extensible linter built specifically to foster inclusive writing and documentation. Whether you are writing READMEs, technical documentation, or blog posts, Aegis helps maintain a welcoming tone by scanning your text for non-inclusive, biased, or profane terms. Utilizing a robust AST-based approach, it completely ignores code blocks, attributes, and scripts to focus strictly on human-readable prose, providing helpful suggestions without false positives on technical syntax.

---

## ✨ Key Features

- **Multi-Format Support:** Analyzes Markdown, MDX, HTML, and Plain Text out of the box.
- **Smart Prose Extraction:** Uses AST traversal to parse only human-readable text, safely ignoring code snippets and raw syntax.
- **Equality & Profanity Analysis:** Detects biased/unequal phrasing and checks against a rated profanity dictionary with neutral alternatives suggested.
- **Highly Configurable:** Supports in-document directives (e.g., `<!--aegis ignore-->`) and standard configuration files (like `.aegisrc` or `package.json`).

---

## 🛠 Built With

This project leverages the following technologies:

- **[Node.js](https://nodejs.org/)** (v18+)
- **[Unified Ecosystem](https://unifiedjs.com/)** (`remark`, `rehype`)
- **[Acorn](https://github.com/acornjs/acorn)**
- **[Cosmiconfig](https://github.com/cosmiconfig/cosmiconfig)**

---

## 🚀 Getting Started

Follow these instructions to get a copy of the project up and running on your local machine for development and testing purposes.

### Prerequisites

You will need the following tools installed on your system:

- **Node.js v18 or higher** (Required for the native `node --test` runner)
- **npm** (Node Package Manager)

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/[your-username]/aegis.git
   ```

2. **Navigate to the project directory:**
   ```bash
   cd aegis
   ```

3. **Install dependencies:**
   ```bash
   npm install
   ```

---

## 💡 Usage

You can run Aegis programmatically or via the command-line interface. 

### Command Line Interface (CLI)

Run Aegis against a glob of files:
```bash
node ./bin/aegis.js "docs/**/*.md"
```

*Note: You can link the package globally using `npm link` to simply run `aegis "docs/**/*.md"`.*

### Configuration

Configuration is automatically loaded via `cosmiconfig`. Create a `.aegisrc.yml`, `.aegisrc.json`, or an `aegis` field in your `package.json` to customize rules, allowlists, or denylists.

---

## 🤝 Contributing

Contributions are what make the open source community such an amazing place to learn, inspire, and create. Any contributions you make are **greatly appreciated**.

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📄 License

Distributed under the **ISC** License. See `LICENSE` for more information.

---

## 📬 Contact

**[Your Name]** - [@your_twitter](https://twitter.com/your_twitter) - email@example.com

Project Link: [https://github.com/[your-username]/aegis](https://github.com/[your-username]/aegis)
