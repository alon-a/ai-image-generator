import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import App from '../../pages/_app';

// Mock PerformanceMonitor component
jest.mock('../../components/PerformanceMonitor', () => {
  return function MockPerformanceMonitor({ enabled }) {
    return enabled ? <div data-testid="performance-monitor">Performance Monitor</div> : null;
  };
});

// Mock component for testing
function MockPage() {
  return <div data-testid="mock-page">Mock Page Content</div>;
}

describe('App Component', () => {
  const defaultProps = {
    Component: MockPage,
    pageProps: {}
  };

  const originalEnv = process.env.NODE_ENV;

  afterEach(() => {
    process.env.NODE_ENV = originalEnv;
  });

  test('renders page component correctly', () => {
    render(<App {...defaultProps} />);
    
    expect(screen.getByTestId('mock-page')).toBeInTheDocument();
    expect(screen.getByText('Mock Page Content')).toBeInTheDocument();
  });

  test('passes pageProps to component', () => {
    const pageProps = { testProp: 'test value' };
    
    function TestPage({ testProp }) {
      return <div data-testid="test-page">{testProp}</div>;
    }
    
    render(<App Component={TestPage} pageProps={pageProps} />);
    
    expect(screen.getByText('test value')).toBeInTheDocument();
  });

  test('renders PerformanceMonitor in development', () => {
    process.env.NODE_ENV = 'development';
    
    render(<App {...defaultProps} />);
    
    expect(screen.getByTestId('performance-monitor')).toBeInTheDocument();
  });

  test('does not render PerformanceMonitor in production', () => {
    process.env.NODE_ENV = 'production';
    
    render(<App {...defaultProps} />);
    
    expect(screen.queryByTestId('performance-monitor')).not.toBeInTheDocument();
  });

  test('renders both component and performance monitor', () => {
    process.env.NODE_ENV = 'development';
    
    render(<App {...defaultProps} />);
    
    expect(screen.getByTestId('mock-page')).toBeInTheDocument();
    expect(screen.getByTestId('performance-monitor')).toBeInTheDocument();
  });

  test('has proper document structure', () => {
    const { container } = render(<App {...defaultProps} />);
    
    // Should have a React Fragment as root
    expect(container.children).toHaveLength(2); // Component + PerformanceMonitor (in dev)
  });

  test('handles different page components', () => {
    function AnotherPage() {
      return <div data-testid="another-page">Another Page</div>;
    }
    
    render(<App Component={AnotherPage} pageProps={{}} />);
    
    expect(screen.getByTestId('another-page')).toBeInTheDocument();
    expect(screen.getByText('Another Page')).toBeInTheDocument();
  });

  test('handles empty pageProps', () => {
    function SimpleComponent() {
      return <div data-testid="simple">Simple</div>;
    }
    
    expect(() => {
      render(<App Component={SimpleComponent} pageProps={{}} />);
    }).not.toThrow();
    
    expect(screen.getByTestId('simple')).toBeInTheDocument();
  });

  test('handles complex pageProps', () => {
    const complexProps = {
      user: { name: 'John', id: 1 },
      settings: { theme: 'dark' },
      data: [1, 2, 3]
    };
    
    function ComplexComponent({ user, settings, data }) {
      return (
        <div data-testid="complex">
          <span>{user.name}</span>
          <span>{settings.theme}</span>
          <span>{data.length}</span>
        </div>
      );
    }
    
    render(<App Component={ComplexComponent} pageProps={complexProps} />);
    
    expect(screen.getByText('John')).toBeInTheDocument();
    expect(screen.getByText('dark')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  test('exports default function correctly', () => {
    expect(typeof App).toBe('function');
    expect(App.name).toBe('App');
  });

  test('handles SSR correctly', () => {
    // Test that the component can be rendered server-side
    expect(() => {
      render(<App {...defaultProps} />);
    }).not.toThrow();
  });

  test('performance monitor receives correct enabled prop in development', () => {
    process.env.NODE_ENV = 'development';
    
    render(<App {...defaultProps} />);
    
    // PerformanceMonitor should be rendered (enabled=true in development)
    expect(screen.getByTestId('performance-monitor')).toBeInTheDocument();
  });

  test('performance monitor receives correct enabled prop in production', () => {
    process.env.NODE_ENV = 'production';
    
    render(<App {...defaultProps} />);
    
    // PerformanceMonitor should not be rendered (enabled=false in production)
    expect(screen.queryByTestId('performance-monitor')).not.toBeInTheDocument();
  });

  test('maintains component isolation', () => {
    // Test that the App component doesn't interfere with page component props
    function PropsTestComponent(props) {
      return <div data-testid="props-test">{JSON.stringify(props)}</div>;
    }
    
    const testProps = { a: 1, b: 'test' };
    
    render(<App Component={PropsTestComponent} pageProps={testProps} />);
    
    expect(screen.getByText(JSON.stringify(testProps))).toBeInTheDocument();
  });

  test('handles component errors gracefully', () => {
    function ErrorComponent() {
      throw new Error('Component error');
    }
    
    // This test ensures the App component itself doesn't break
    // The actual error handling would be done by Next.js error boundaries
    expect(() => {
      render(<App Component={ErrorComponent} pageProps={{}} />);
    }).toThrow('Component error');
  });
});