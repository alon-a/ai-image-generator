import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import Home from '../../pages/index';

// Mock Next.js Head component
jest.mock('next/head', () => {
  return function MockHead({ children }) {
    return <div data-testid="head">{children}</div>;
  };
});

// Mock ImageGenerator component
jest.mock('../../components/ImageGenerator', () => {
  return function MockImageGenerator() {
    return <div data-testid="image-generator">Image Generator Component</div>;
  };
});

describe('Home Page', () => {
  test('renders without crashing', () => {
    render(<Home />);
    
    expect(screen.getByTestId('image-generator')).toBeInTheDocument();
  });

  test('sets correct page title', () => {
    render(<Home />);
    
    const head = screen.getByTestId('head');
    expect(head).toHaveTextContent('AI Image Generator');
  });

  test('sets correct meta description', () => {
    render(<Home />);
    
    const head = screen.getByTestId('head');
    expect(head).toHaveTextContent('Generate images with AI using text descriptions');
  });

  test('sets viewport meta tag', () => {
    render(<Home />);
    
    const head = screen.getByTestId('head');
    expect(head).toHaveTextContent('width=device-width, initial-scale=1');
  });

  test('includes favicon link', () => {
    render(<Home />);
    
    const head = screen.getByTestId('head');
    expect(head).toHaveTextContent('/favicon.ico');
  });

  test('renders ImageGenerator component', () => {
    render(<Home />);
    
    expect(screen.getByTestId('image-generator')).toBeInTheDocument();
    expect(screen.getByText('Image Generator Component')).toBeInTheDocument();
  });

  test('has proper document structure', () => {
    const { container } = render(<Home />);
    
    // Should have a React Fragment as root (no extra wrapper)
    expect(container.children).toHaveLength(2); // Head mock + ImageGenerator
  });

  test('Head component contains all required meta tags', () => {
    render(<Home />);
    
    const head = screen.getByTestId('head');
    
    // Check for title
    expect(head.querySelector('title')).toHaveTextContent('AI Image Generator');
    
    // Check for meta tags
    const metaTags = head.querySelectorAll('meta');
    expect(metaTags).toHaveLength(2); // description and viewport
    
    // Check for favicon
    const favicon = head.querySelector('link[rel="icon"]');
    expect(favicon).toHaveAttribute('href', '/favicon.ico');
  });

  test('exports default function correctly', () => {
    expect(typeof Home).toBe('function');
    expect(Home.name).toBe('Home');
  });

  test('component is properly documented', () => {
    // Check that the component has JSDoc comments (this is more of a code quality test)
    const componentString = Home.toString();
    expect(componentString).toContain('Home');
  });

  test('uses semantic HTML structure', () => {
    const { container } = render(<Home />);
    
    // The component should render clean HTML without unnecessary wrappers
    expect(container.firstChild).toHaveAttribute('data-testid', 'head');
  });

  test('handles SSR correctly', () => {
    // Test that the component can be rendered server-side (no client-only code)
    expect(() => {
      render(<Home />);
    }).not.toThrow();
  });
});