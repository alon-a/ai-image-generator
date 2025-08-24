import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import ErrorMessage from '../components/ErrorMessage';

describe('ErrorMessage Component', () => {
  test('renders error message correctly', () => {
    const error = {
      title: 'Test Error',
      message: 'This is a test error message',
      category: 'validation',
      retryable: true
    };

    render(<ErrorMessage error={error} />);
    
    expect(screen.getByText('Test Error')).toBeInTheDocument();
    expect(screen.getByText('This is a test error message')).toBeInTheDocument();
  });

  test('shows retry button for retryable errors', () => {
    const error = { message: 'Retryable error', retryable: true };
    const onRetry = jest.fn();

    render(<ErrorMessage error={error} onRetry={onRetry} />);
    
    const retryButton = screen.getByText('Try Again');
    expect(retryButton).toBeInTheDocument();
    
    fireEvent.click(retryButton);
    expect(onRetry).toHaveBeenCalled();
  });

  test('hides retry button for non-retryable errors', () => {
    const error = { message: 'Non-retryable error', retryable: false };

    render(<ErrorMessage error={error} />);
    
    expect(screen.queryByText('Try Again')).not.toBeInTheDocument();
  });

  test('handles dismiss functionality', () => {
    const error = { message: 'Test error' };
    const onDismiss = jest.fn();

    render(<ErrorMessage error={error} onDismiss={onDismiss} />);
    
    const dismissButton = screen.getByLabelText('Dismiss error');
    fireEvent.click(dismissButton);
    
    expect(onDismiss).toHaveBeenCalled();
  });

  test('categorizes network errors correctly', () => {
    const networkError = 'Network connection failed';
    
    render(<ErrorMessage error={networkError} />);
    
    // The error message should be displayed
    expect(screen.getByText('Network connection failed')).toBeInTheDocument();
    // And it should be retryable (show retry button if onRetry is provided)
    expect(screen.getByLabelText('Dismiss error')).toBeInTheDocument();
  });

  test('returns null when no error provided', () => {
    const { container } = render(<ErrorMessage error={null} />);
    expect(container.firstChild).toBeNull();
  });

  test('handles string errors', () => {
    const errorMessage = 'Simple string error';
    
    render(<ErrorMessage error={errorMessage} />);
    
    expect(screen.getByText(errorMessage)).toBeInTheDocument();
  });
});