import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Button } from './button';

describe('Button', () => {
  it('should render button with text', () => {
    render(<Button>Click me</Button>);

    expect(screen.getByText('Click me')).toBeInTheDocument();
  });

  it('should handle click events', () => {
    const handleClick = vi.fn();
    render(<Button onClick={handleClick}>Click me</Button>);

    fireEvent.click(screen.getByText('Click me'));

    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('should be disabled when disabled prop is true', () => {
    render(<Button disabled>Click me</Button>);

    const button = screen.getByText('Click me');
    expect(button).toBeDisabled();
  });

  it('should not call onClick when disabled', () => {
    const handleClick = vi.fn();
    render(<Button disabled onClick={handleClick}>Click me</Button>);

    fireEvent.click(screen.getByText('Click me'));

    expect(handleClick).not.toHaveBeenCalled();
  });

  it('should apply default variant classes', () => {
    render(<Button>Default</Button>);

    const button = screen.getByText('Default');
    expect(button).toHaveClass('bg-primary');
  });

  it('should apply outline variant classes', () => {
    render(<Button variant="outline">Outline</Button>);

    const button = screen.getByText('Outline');
    expect(button).toHaveClass('border');
  });

  it('should apply ghost variant classes', () => {
    render(<Button variant="ghost">Ghost</Button>);

    const button = screen.getByText('Ghost');
    expect(button).toHaveClass('hover:bg-accent');
  });

  it('should apply different sizes', () => {
    const { rerender } = render(<Button size="sm">Small</Button>);
    expect(screen.getByText('Small')).toHaveClass('h-9');

    rerender(<Button size="lg">Large</Button>);
    expect(screen.getByText('Large')).toHaveClass('h-12');
  });

  it('should apply custom className', () => {
    render(<Button className="custom-class">Button</Button>);

    expect(screen.getByText('Button')).toHaveClass('custom-class');
  });

  it('should forward ref', () => {
    const ref = { current: null };
    render(<Button ref={ref as any}>Button</Button>);

    expect(ref.current).toBeInstanceOf(HTMLButtonElement);
  });
});
