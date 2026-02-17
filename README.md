# EloCoach

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Electron](https://img.shields.io/badge/Electron-47848F?logo=electron&logoColor=white)](https://www.electronjs.org/)
[![Jest](https://img.shields.io/badge/Jest-C21325?logo=jest&logoColor=white)](https://jestjs.io/)

EloCoach is a cross-platform desktop application built with Electron that provides a transparent overlay for real-time strategic analysis in competitive gaming environments. Leveraging the Riot Live Client API, it enables dynamic monitoring of game states, player tracking, tactical event prediction, and interactive UI elements to enhance decision-making during gameplay.

## Features

- **Transparent Overlay Interface**: Click-through window that overlays game visuals without interfering with input, utilizing Electron's window management APIs.
- **Real-Time Data Polling**: Continuous integration with external APIs for live game state updates, including player positions, objectives, and environmental data.
- **Tactical Heuristics Engine**: Advanced algorithms for predicting strategic events based on game time, player movements, and environmental factors.
- **Dynamic UI Components**: Responsive elements displaying timers, alerts, and status indicators that adapt to game phases.
- **Simulation Mode**: Built-in mock provider for testing and development, allowing offline scenario simulation.
- **Modular Architecture**: Clean separation of concerns with dedicated providers, logic modules, and data contracts for maintainability.
- **Type-Safe Development**: Full TypeScript implementation ensuring compile-time type checking and improved code reliability.
- **Automated Testing**: Comprehensive unit test coverage using Jest framework for critical logic components.

## Tech Stack

- **Framework**: [Electron](https://www.electronjs.org/) - Cross-platform desktop app development
- **Language**: [TypeScript](https://www.typescriptlang.org/) - Type-safe JavaScript with static typing
- **Build Tool**: [Webpack](https://webpack.js.org/) - Module bundling and asset optimization
- **Testing**: [Jest](https://jestjs.io/) - JavaScript testing framework with mocking capabilities
- **Linting**: [ESLint](https://eslint.org/) - Code quality and style enforcement
- **Packaging**: [Electron Forge](https://www.electronforge.io/) - Application packaging and distribution
- **API Integration**: Riot Live Client API - Real-time game data consumption

## Prerequisites

- Node.js (v16 or higher)
- npm or yarn package manager
- Access to target gaming platform's local API (for live data integration)

## Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/elocoach.git
   cd elocoach
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Build the application:
   ```bash
   npm run package
   ```

## Usage

### Development Mode
```bash
npm run start
```

### Production Build
```bash
npm run make
```

### Testing
```bash
npm run test
```

The application launches a transparent overlay window that monitors game state in real-time. During active gameplay, it displays:
- Wave timers with siege minion indicators
- Tactical risk assessments
- Enemy champion status and vision data
- Strategic hypotheses based on current game factors

## Development

### Project Structure
```
src/
├── contracts/          # TypeScript interfaces and data models
├── logic/             # Core business logic modules
│   ├── __tests__/     # Unit test files
│   └── ...            # Tactical engines and predictors
├── providers/         # Data providers (API integrations)
└── ...                # Main process and renderer files
```

### Key Components

- **Providers**: Abstract data access layer supporting multiple data sources (live API, mock data)
- **Logic Modules**: Specialized engines for game state analysis and prediction algorithms
- **Contracts**: Strongly-typed data structures ensuring API consistency
- **Renderer**: UI update logic for dynamic overlay elements

### Adding New Features

1. Define data contracts in `src/contracts/`
2. Implement logic in appropriate module under `src/logic/`
3. Add provider methods if new data sources are needed
4. Update renderer for UI integration
5. Write comprehensive tests

## Testing

Run the test suite:
```bash
npm run test
```

Tests cover:
- Logic module algorithms
- Provider data handling
- Mock data scenarios
- Error condition handling

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Code Standards
- TypeScript strict mode enabled
- ESLint configuration for code quality
- Comprehensive test coverage for new features
- Clear commit messages and documentation

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- Built with [Electron](https://www.electronjs.org/) for cross-platform desktop capabilities
- Real-time data integration powered by Riot Games' Live Client API
- UI assets sourced from Data Dragon and Community Dragon APIs
- Testing framework provided by [Jest](https://jestjs.io/)
