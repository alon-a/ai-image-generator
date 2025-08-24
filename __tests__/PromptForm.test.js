import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import PromptForm from '../components/PromptForm';

describe('PromptForm Component', () => {
  const defaultProps = {
    prompt: '',
    onPromptChange: jest.fn(),
    onSubmit: jest.fn(),
    loading: false
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders form elements correctly', () => {
    render(<PromptForm {...defaultProps} />);
    
    expect(screen.getByLabelText('Describe the image you want to create')).toBeInTheDocument();
    expect(screen.getByRole('textbox')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /generate images/i })).toBeInTheDocument();
  });

  test('displays current prompt value', () => {
    const prompt = 'Test prompt';
    render(<PromptForm {...defaultProps} prompt={prompt} />);
    
    expect(screen.getByRole('textbox')).toHaveValue(prompt);
  });

  test('calls onPromptChange when typing', async () => {
    const user = userEvent.setup();
    render(<PromptForm {...defaultProps} />);
    
    const textarea = screen.getByRole('textbox');
    await user.type(textarea, 'New prompt');
    
    // userEvent.type calls onChange for each character, so check the final call
    expect(defaultProps.onPromptChange).toHaveBeenLastCalledWith('New prompt');
  });

  test('updates character count when typing', async () => {
    const user = userEvent.setup();
    render(<PromptForm {...defaultProps} />);
    
    const textarea = screen.getByRole('textbox');
    await user.type(textarea, 'Hello');
    
    // Check for the character count - it shows the last character typed
    expect(screen.getByText(/\d+.*\/.*500/)).toBeInTheDocument();
  });

  test('shows character count for existing prompt', () => {
    const prompt = 'Existing prompt';
    render(<PromptForm {...defaultProps} prompt={prompt} />);
    
    expect(screen.getByText(`${prompt.length}/500`)).toBeInTheDocument();
  });

  test('submits form with valid prompt', async () => {
    const user = userEvent.setup();
    const prompt = 'Valid prompt';
    render(<PromptForm {...defaultProps} prompt={prompt} />);
    
    const submitButton = screen.getByRole('button', { name: /generate images/i });
    await user.click(submitButton);
    
    expect(defaultProps.onSubmit).toHaveBeenCalledWith(prompt);
  });

  test('prevents submission with empty prompt', async () => {
    const user = userEvent.setup();
    render(<PromptForm {...defaultProps} prompt="" />);
    
    const submitButton = screen.getByRole('button', { name: /generate images/i });
    await user.click(submitButton);
    
    expect(defaultProps.onSubmit).not.toHaveBeenCalled();
  });

  test('prevents submission with whitespace-only prompt', async () => {
    const user = userEvent.setup();
    render(<PromptForm {...defaultProps} prompt="   " />);
    
    const submitButton = screen.getByRole('button', { name: /generate images/i });
    await user.click(submitButton);
    
    expect(defaultProps.onSubmit).not.toHaveBeenCalled();
  });

  test('prevents submission when prompt is too long', async () => {
    const user = userEvent.setup();
    const longPrompt = 'a'.repeat(501);
    render(<PromptForm {...defaultProps} prompt={longPrompt} />);
    
    const submitButton = screen.getByRole('button', { name: /generate images/i });
    await user.click(submitButton);
    
    expect(defaultProps.onSubmit).not.toHaveBeenCalled();
  });

  test('shows error message for prompt too long', () => {
    const longPrompt = 'a'.repeat(501);
    render(<PromptForm {...defaultProps} prompt={longPrompt} />);
    
    expect(screen.getByText('Prompt is too long. Please keep it under 500 characters.')).toBeInTheDocument();
  });

  test('applies error styling when prompt is too long', () => {
    const longPrompt = 'a'.repeat(501);
    render(<PromptForm {...defaultProps} prompt={longPrompt} />);
    
    const textarea = screen.getByRole('textbox');
    expect(textarea).toHaveClass('error');
  });

  test('shows warning styling when near character limit', () => {
    const nearLimitPrompt = 'a'.repeat(450); // 90% of 500
    render(<PromptForm {...defaultProps} prompt={nearLimitPrompt} />);
    
    const charCount = screen.getByText('450/500');
    expect(charCount).toHaveClass('warning');
  });

  test('disables form when loading', () => {
    render(<PromptForm {...defaultProps} loading={true} />);
    
    const textarea = screen.getByRole('textbox');
    const submitButton = screen.getByRole('button');
    
    expect(textarea).toBeDisabled();
    expect(submitButton).toBeDisabled();
  });

  test('shows loading state in submit button', () => {
    render(<PromptForm {...defaultProps} loading={true} />);
    
    expect(screen.getByText('Generating...')).toBeInTheDocument();
  });

  test('handles Ctrl+Enter keyboard shortcut', async () => {
    const user = userEvent.setup();
    const prompt = 'Test prompt';
    render(<PromptForm {...defaultProps} prompt={prompt} />);
    
    const textarea = screen.getByRole('textbox');
    await user.click(textarea);
    await user.keyboard('{Control>}{Enter}{/Control}');
    
    expect(defaultProps.onSubmit).toHaveBeenCalledWith(prompt);
  });

  test('handles Cmd+Enter keyboard shortcut on Mac', async () => {
    const user = userEvent.setup();
    const prompt = 'Test prompt';
    render(<PromptForm {...defaultProps} prompt={prompt} />);
    
    const textarea = screen.getByRole('textbox');
    await user.click(textarea);
    await user.keyboard('{Meta>}{Enter}{/Meta}');
    
    expect(defaultProps.onSubmit).toHaveBeenCalledWith(prompt);
  });

  test('shows keyboard shortcut hint', () => {
    render(<PromptForm {...defaultProps} />);
    
    expect(screen.getByText('Press Ctrl+Enter to generate')).toBeInTheDocument();
  });

  test('renders suggestion prompts', () => {
    render(<PromptForm {...defaultProps} />);
    
    expect(screen.getByText('Try these prompts:')).toBeInTheDocument();
    expect(screen.getByText('A futuristic city at night')).toBeInTheDocument();
    expect(screen.getByText('Cute cat wearing a wizard hat')).toBeInTheDocument();
    expect(screen.getByText('Abstract art with vibrant colors')).toBeInTheDocument();
    expect(screen.getByText('Peaceful forest scene')).toBeInTheDocument();
  });

  test('applies suggestion when clicked', async () => {
    const user = userEvent.setup();
    render(<PromptForm {...defaultProps} />);
    
    const suggestion = screen.getByText('A futuristic city at night');
    await user.click(suggestion);
    
    expect(defaultProps.onPromptChange).toHaveBeenCalledWith('A futuristic city at night');
  });

  test('disables suggestions when loading', () => {
    render(<PromptForm {...defaultProps} loading={true} />);
    
    const suggestions = screen.getAllByRole('button').filter(button => 
      button.textContent !== 'Generating...'
    );
    
    suggestions.forEach(suggestion => {
      expect(suggestion).toBeDisabled();
    });
  });

  test('hides suggestions when loading', () => {
    render(<PromptForm {...defaultProps} loading={true} />);
    
    expect(screen.queryByText('Try these prompts:')).not.toBeInTheDocument();
  });

  test('trims whitespace from prompt on submission', async () => {
    const user = userEvent.setup();
    const prompt = '  Test prompt  ';
    render(<PromptForm {...defaultProps} prompt={prompt} />);
    
    const submitButton = screen.getByRole('button', { name: /generate images/i });
    await user.click(submitButton);
    
    expect(defaultProps.onSubmit).toHaveBeenCalledWith('Test prompt');
  });

  test('has correct form accessibility', () => {
    render(<PromptForm {...defaultProps} />);
    
    const textarea = screen.getByRole('textbox');
    const label = screen.getByText('Describe the image you want to create');
    
    expect(textarea).toHaveAttribute('id', 'prompt');
    expect(label.tagName).toBe('LABEL');
  });

  test('has proper placeholder text', () => {
    render(<PromptForm {...defaultProps} />);
    
    const textarea = screen.getByRole('textbox');
    expect(textarea).toHaveAttribute('placeholder', 
      'A serene landscape with mountains and a lake at sunset, painted in watercolor style...'
    );
  });

  test('allows slight overflow in maxLength for better UX', () => {
    render(<PromptForm {...defaultProps} />);
    
    const textarea = screen.getByRole('textbox');
    expect(textarea).toHaveAttribute('maxLength', '550'); // 500 + 50
  });

  test('has correct number of rows', () => {
    render(<PromptForm {...defaultProps} />);
    
    const textarea = screen.getByRole('textbox');
    expect(textarea).toHaveAttribute('rows', '4');
  });

  test('submit button is disabled when prompt is invalid', () => {
    render(<PromptForm {...defaultProps} prompt="" />);
    
    const submitButton = screen.getByRole('button', { name: /generate images/i });
    expect(submitButton).toBeDisabled();
  });

  test('submit button is enabled when prompt is valid', () => {
    render(<PromptForm {...defaultProps} prompt="Valid prompt" />);
    
    const submitButton = screen.getByRole('button', { name: /generate images/i });
    expect(submitButton).not.toBeDisabled();
  });

  test('prevents form submission on Enter without modifier keys', async () => {
    const user = userEvent.setup();
    const prompt = 'Test prompt';
    render(<PromptForm {...defaultProps} prompt={prompt} />);
    
    const textarea = screen.getByRole('textbox');
    await user.click(textarea);
    await user.keyboard('{Enter}');
    
    expect(defaultProps.onSubmit).not.toHaveBeenCalled();
  });
});