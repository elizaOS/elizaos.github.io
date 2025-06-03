import React from 'react';
import { render, screen, within, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import ContributorActivityTimeline from './ContributorActivityTimeline';
import { TimelineActivityData, ContributorActivityHour } from '@/lib/data/types';

// Mock the Tooltip components from antd or similar library if they cause issues
// For this example, assuming a simple TooltipProvider mock is enough or not needed
// if the UI library's Tooltip works well in JSDOM or is simple enough.
// If using shadcn/ui tooltips, they often need TooltipProvider.
jest.mock('@/components/ui/tooltip', () => ({
  Tooltip: ({ children }: { children: React.ReactNode }) => <div data-testid="tooltip">{children}</div>,
  TooltipTrigger: ({ children }: { children: React.ReactNode }) => <div data-testid="tooltip-trigger">{children}</div>,
  TooltipContent: ({ children }: { children: React.ReactNode }) => <div data-testid="tooltip-content">{children}</div>,
  TooltipProvider: ({ children }: { children: React.ReactNode }) => <div data-testid="tooltip-provider">{children}</div>,
}));


describe('ContributorActivityTimeline', () => {
  const generateMockActivity = (login: string, hour: number, avatarUrl?: string): ContributorActivityHour => ({
    login,
    hour,
    avatarUrl: avatarUrl === undefined ? `/${login.toLowerCase()}.png` : avatarUrl, // Default avatar if not specified
  });

  test('renders "no activity" message when activityData is empty', () => {
    render(<ContributorActivityTimeline activityData={[]} />);
    expect(screen.getByText(/No contributor activity recorded for this day/i)).toBeInTheDocument();
    
    // Check that no hour-specific elements like avatars are rendered
    // queryByRole is used because getByRole would throw an error if not found, which is what we want to avoid here.
    const avatars = screen.queryAllByRole('img');
    expect(avatars.length).toBe(0);

    // Check if hour labels are still rendered (they should be, but empty)
    for (let i = 0; i < 24; i++) {
      const hourLabel = String(i).padStart(2, '0');
      expect(screen.getByText(hourLabel)).toBeInTheDocument();
    }
  });

  test('renders activity for a single contributor in a single hour', () => {
    const mockData: TimelineActivityData = [generateMockActivity('userA', 10, 'userA.png')];
    render(<ContributorActivityTimeline activityData={mockData} />);

    const hourSlotLabel = screen.getByText('10');
    expect(hourSlotLabel).toBeInTheDocument();

    // Find the parent div of the hour label, then the avatars container within it
    const hourSlotDiv = hourSlotLabel.closest('.hour-slot');
    expect(hourSlotDiv).toBeInTheDocument();

    if (hourSlotDiv) {
      const avatarImg = within(hourSlotDiv).getByRole('img', { name: /userA/i });
      expect(avatarImg).toBeInTheDocument();
      expect(avatarImg).toHaveAttribute('src', 'userA.png');
      
      // Check for tooltip content (mocked)
      // This simplified mock check might need adjustment based on actual Tooltip behavior
      const tooltipTrigger = within(hourSlotDiv).getByTestId('tooltip-trigger');
      expect(within(tooltipTrigger).getByRole('img', {name: /userA/i})).toBeInTheDocument();
      // The mocked TooltipContent would exist if our mock structure was more complex.
      // For now, we assume the presence of the trigger implies the tooltip structure.
    }
  });

  test('renders activities for multiple contributors in the same hour', () => {
    const mockData: TimelineActivityData = [
      generateMockActivity('userA', 14, 'userA.png'),
      generateMockActivity('userB', 14, 'userB.png'),
    ];
    render(<ContributorActivityTimeline activityData={mockData} />);

    const hourSlotLabel = screen.getByText('14');
    const hourSlotDiv = hourSlotLabel.closest('.hour-slot');
    expect(hourSlotDiv).toBeInTheDocument();

    if (hourSlotDiv) {
      const avatarA = within(hourSlotDiv).getByRole('img', { name: /userA/i });
      expect(avatarA).toBeInTheDocument();
      expect(avatarA).toHaveAttribute('src', 'userA.png');

      const avatarB = within(hourSlotDiv).getByRole('img', { name: /userB/i });
      expect(avatarB).toBeInTheDocument();
      expect(avatarB).toHaveAttribute('src', 'userB.png');
    }
  });

  test('renders activities spanning multiple hours', () => {
    const mockData: TimelineActivityData = [
      generateMockActivity('userA', 9, 'userA.png'),
      generateMockActivity('userB', 17, 'userB.png'),
    ];
    render(<ContributorActivityTimeline activityData={mockData} />);

    const hourSlot9 = screen.getByText('09').closest('.hour-slot');
    expect(hourSlot9).toBeInTheDocument();
    if (hourSlot9) {
      expect(within(hourSlot9).getByRole('img', { name: /userA/i })).toBeInTheDocument();
    }

    const hourSlot17 = screen.getByText('17').closest('.hour-slot');
    expect(hourSlot17).toBeInTheDocument();
    if (hourSlot17) {
      expect(within(hourSlot17).getByRole('img', { name: /userB/i })).toBeInTheDocument();
    }
  });

  test('renders avatar fallback when avatarUrl is null or undefined', () => {
    const mockData: TimelineActivityData = [generateMockActivity('userX', 12, null as any)]; // Pass null for avatarUrl
    render(<ContributorActivityTimeline activityData={mockData} />);
    
    const hourSlot12 = screen.getByText('12').closest('.hour-slot');
    expect(hourSlot12).toBeInTheDocument();

    if (hourSlot12) {
      // Check for fallback text (e.g., initials "UX")
      // The AvatarFallback in the component uses login.substring(0, 2).toUpperCase()
      const fallback = within(hourSlot12).getByText('UX');
      expect(fallback).toBeInTheDocument();
      
      // Ensure no 'img' role is found if fallback is active for this specific avatar
      const imagesInSlot = within(hourSlot12).queryAllByRole('img');
      // This assertion depends on how AvatarImage and AvatarFallback interact.
      // If AvatarImage is still rendered but hidden, this might need adjustment.
      // Typically, if src is invalid/null, only fallback is visible.
      // Let's assume the image src would be empty or invalid, and thus not rendered as a meaningful image.
      // A more robust test might involve checking that the specific AvatarImage for 'userX' is not present or has no src.
      let imgFound = false;
      imagesInSlot.forEach(img => {
        if(img.getAttribute('alt') === 'userX') imgFound = true;
      });
      expect(imgFound).toBe(false); // No direct image for userX if fallback is shown
    }
  });
  
  test('renders avatar fallback when avatarUrl is an empty string', () => {
    const mockData: TimelineActivityData = [generateMockActivity('userY', 13, '')]; // Pass empty string for avatarUrl
    render(<ContributorActivityTimeline activityData={mockData} />);
    
    const hourSlot13 = screen.getByText('13').closest('.hour-slot');
    expect(hourSlot13).toBeInTheDocument();

    if (hourSlot13) {
      const fallback = within(hourSlot13).getByText('UY');
      expect(fallback).toBeInTheDocument();
       let imgFound = false;
      const imagesInSlot = within(hourSlot13).queryAllByRole('img');
      imagesInSlot.forEach(img => {
        if(img.getAttribute('alt') === 'userY') imgFound = true;
      });
      expect(imgFound).toBe(false);
    }
  });


  test('renders all 24 hour labels', () => {
    render(<ContributorActivityTimeline activityData={[]} />); // Data doesn't matter for this test
    for (let i = 0; i < 24; i++) {
      const hourLabel = String(i).padStart(2, '0');
      expect(screen.getByText(hourLabel)).toBeInTheDocument();
    }
  });

  test('does not duplicate users within the same hour slot in display', () => {
    // The component internally de-duplicates based on login per hour for display.
    // This test ensures that if the input `activityData` (which should already be unique per user-hour from query)
    // somehow had duplicates, the display would still be correct.
    const mockData: TimelineActivityData = [
      generateMockActivity('userA', 10, 'userA.png'),
      generateMockActivity('userA', 10, 'userA.png'), // Duplicate entry
    ];
    render(<ContributorActivityTimeline activityData={mockData} />);

    const hourSlotLabel = screen.getByText('10');
    const hourSlotDiv = hourSlotLabel.closest('.hour-slot');
    expect(hourSlotDiv).toBeInTheDocument();

    if (hourSlotDiv) {
      const avatars = within(hourSlotDiv).getAllByRole('img', { name: /userA/i });
      expect(avatars).toHaveLength(1); // Should only render one avatar for userA in this slot
    }
  });

});
