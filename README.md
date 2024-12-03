# Graph Designer

A React application that visualizes graph components and their connectivity using an interactive interface.

![Graph Designer Screenshot](screenshot.png)

## Features

- Add vertices with custom or auto-generated names
- Create edges between vertices
- Automatic coloring of connected components
- Interactive graph visualization with drag & drop
- Box selection for multiple elements
- Delete vertices and edges with keyboard
- Responsive design for mobile and desktop
- Dark mode support

## Tech Stack

- React 18
- TypeScript
- Vite
- Cytoscape.js (for graph visualization)
- Tailwind CSS
- Radix UI (for accessible components)
- Lucide React (for icons)
- shadcn/ui components

## Getting Started

### Prerequisites

- Node.js (v18 or higher recommended)
- npm or yarn

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/ElemarJR/graph-designer.git
   ```

2. Navigate to the project directory:
   ```bash
   cd graph-designer
   ```

3. Install dependencies:
   ```bash
   npm install
   # or
   yarn install
   ```

### Running the Application

1. Start the development server:
   ```bash
   npm run dev
   # or
   yarn dev
   ```

2. Open your browser and navigate to `http://localhost:5173`

## Usage

1. Add vertices by entering a name or using auto-generated IDs
2. Select source and target vertices to create edges
3. Drag vertices to rearrange the graph
4. Use box selection to select multiple elements
5. Press Delete/Backspace to remove selected elements
6. Observe automatic coloring of connected components

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Technical Implementation

### Graph Visualization

The application uses Cytoscape.js for graph visualization with features like:
- Custom styling for nodes and edges
- Interactive drag and drop
- Box selection
- Bezier curve edges with arrows
- Automatic layout using CoSE algorithm

### Component Coloring

Connected components are automatically colored using:
- Union-Find data structure for component detection
- Pre-defined color palette for distinct components
- Real-time color updates on graph modifications

### Styling

The application includes custom CSS with:
- Centered root container (max-width: 1280px)
- Responsive padding (2rem)
- Logo animations and hover effects
- Card styling with 2em padding
- Dark mode compatible text colors
- Smooth logo transitions and filters
- Optional motion-based animations

### Browser Compatibility

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)
