import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import LoadingSpinner from '../components/LoadingSpinner';

describe('LoadingSpinner Component', () => {
  test('renders with default message and size', () => {
    render(<LoadingSpinner />);
    
    expect(screen.getByText('Generating your images...')).toBeInTheDocument();
  });

  test('renders with custom message', () => {
    const customMessage = 'Processing your request...';
    render(<LoadingSpinner message={customMessage} />);
    
    expect(screen.getByText(customMessage)).toBeInTheDocument();
  });

  test('applies correct size class', () => {
    const { container: smallContainer } = render(<LoadingSpinner size="small" />);
    const { container: mediumContainer } = render(<LoadingSpinner size="medium" />);
    const { container: largeContainer } = render(<LoadingSpinner size="large" />);
    
    expect(smallContainer.querySelector('.small')).toBeInTheDocument();
    expect(mediumContainer.querySelector('.medium')).toBeInTheDocument();
    expect(largeContainer.querySelector('.large')).toBeInTheDocument();
  });

  test('renders spinner element', () => {
    const { container } = render(<LoadingSpinner />);
    
    const spinner = container.querySelector('.spinner');
    const spinnerInner = container.querySelector('.spinnerInner');
    
    expect(spinner).toBeInTheDocument();
    expect(spinnerInner).toBeInTheDocument();
  });

  test('renders progress steps', () => {
    render(<LoadingSpinner />);
    
    expect(screen.getByText('Processing prompt')).toBeInTheDocument();
    expect(screen.getByText('Generating images')).toBeInTheDocument();
    expect(screen.getByText('Finalizing results')).toBeInTheDocument();
  });

  test('has correct structure for progress steps', () => {
    const { container } = render(<LoadingSpinner />);
    
    const progressSteps = container.querySelector('.progressSteps');
    const steps = container.querySelectorAll('.step');
    const stepIndicators = container.querySelectorAll('.stepIndicator');
    const stepTexts = container.querySelectorAll('.stepText');
    
    expect(progressSteps).toBeInTheDocument();
    expect(steps).toHaveLength(3);
    expect(stepIndicators).toHaveLength(3);
    expect(stepTexts).toHaveLength(3);
  });

  test('applies default medium size when no size provided', () => {
    const { container } = render(<LoadingSpinner />);
    
    const spinner = container.querySelector('.spinner');
    expect(spinner).toHaveClass('medium');
  });

  test('has accessible structure', () => {
    const { container } = render(<LoadingSpinner />);
    
    // Check that the component has proper structure for screen readers
    const container_div = container.querySelector('.container');
    expect(container_div).toBeInTheDocument();
    
    // Message should be in a paragraph for proper semantics
    const message = container.querySelector('.message');
    expect(message.tagName).toBe('P');
  });

  test('renders all required CSS classes', () => {
    const { container } = render(<LoadingSpinner size="large" />);
    
    expect(container.querySelector('.container')).toBeInTheDocument();
    expect(container.querySelector('.spinner')).toBeInTheDocument();
    expect(container.querySelector('.large')).toBeInTheDocument();
    expect(container.querySelector('.spinnerInner')).toBeInTheDocument();
    expect(container.querySelector('.message')).toBeInTheDocument();
    expect(container.querySelector('.progressSteps')).toBeInTheDocument();
  });

  test('handles empty message gracefully', () => {
    render(<LoadingSpinner message="" />);
    
    const message = screen.getByRole('paragraph');
    expect(message).toHaveTextContent('');
  });

  test('handles null message gracefully', () => {
    render(<LoadingSpinner message={null} />);
    
    const message = screen.getByRole('paragraph');
    expect(message).toBeInTheDocument();
  });

  test('handles undefined size gracefully', () => {
    const { container } = render(<LoadingSpinner size={undefined} />);
    
    const spinner = container.querySelector('.spinner');
    expect(spinner).toHaveClass('medium'); // Should default to medium
  });

  test('step indicators have correct structure', () => {
    const { container } = render(<LoadingSpinner />);
    
    const steps = container.querySelectorAll('.step');
    
    steps.forEach(step => {
      expect(step.querySelector('.stepIndicator')).toBeInTheDocument();
      expect(step.querySelector('.stepText')).toBeInTheDocument();
    });
  });

  test('component is properly contained', () => {
    const { container } = render(<LoadingSpinner />);
    
    // Should have a single root container
    expect(container.children).toHaveLength(1);
    expect(container.firstChild).toHaveClass('container');
  });
});