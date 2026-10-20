import { ApplicationStatus } from '@loan-portal/shared';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { StatusBadge } from './status-badge';

describe('StatusBadge', () => {
  it.each([
    [ApplicationStatus.PENDING, 'Pending'],
    [ApplicationStatus.APPROVED, 'Approved'],
    [ApplicationStatus.REJECTED, 'Rejected'],
  ])('labels %s as "%s"', (status, label) => {
    render(<StatusBadge status={status} />);
    expect(screen.getByText(label)).toBeTruthy();
  });

  it('colours each status differently', () => {
    const { rerender } = render(
      <StatusBadge status={ApplicationStatus.APPROVED} />,
    );
    const approved = screen.getByText('Approved').className;
    rerender(<StatusBadge status={ApplicationStatus.REJECTED} />);
    expect(screen.getByText('Rejected').className).not.toBe(approved);
  });
});
