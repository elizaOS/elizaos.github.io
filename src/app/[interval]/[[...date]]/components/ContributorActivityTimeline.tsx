import React from 'react';
import { TimelineActivityData, ContributorActivityHour } from '@/lib/data/types';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'; // Assuming path is correct
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '@/components/ui/tooltip'; // Assuming path is correct

interface ContributorActivityTimelineProps {
  activityData: TimelineActivityData;
}

const ContributorActivityTimeline: React.FC<ContributorActivityTimelineProps> = ({ activityData }) => {
  if (!activityData || activityData.length === 0) {
    return <p className="text-center text-gray-500 py-8">No contributor activity recorded for this day.</p>;
  }

  // Group data by hour
  const activityByHour: { [hour: number]: ContributorActivityHour[] } = {};
  activityData.forEach(activity => {
    if (!activityByHour[activity.hour]) {
      activityByHour[activity.hour] = [];
    }
    // Ensure no duplicate logins within the same hour slot on the timeline display
    if (!activityByHour[activity.hour].find(a => a.login === activity.login)) {
      activityByHour[activity.hour].push(activity);
    }
  });

  const hours = Array.from({ length: 24 }, (_, i) => i); // 0 to 23

  return (
    <TooltipProvider delayDuration={300}>
      <div 
        className="contributor-activity-timeline bg-white shadow rounded-lg p-4 overflow-x-auto"
        style={{ fontFamily: 'sans-serif' }}
      >
        <div style={{ display: 'flex', flexDirection: 'row', minWidth: 'max-content' }}>
          {hours.map(hour => (
            <div 
              key={hour} 
              className="hour-slot" 
              style={{
                flex: '0 0 auto', // Prevent shrinking, allow growing based on content if needed
                width: '70px', // Fixed width for each hour slot
                padding: '8px',
                borderRight: hour < 23 ? '1px solid #eee' : 'none',
                textAlign: 'center',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <div 
                className="hour-label text-xs font-medium text-gray-600"
                style={{ marginBottom: '8px' }}
              >
                {String(hour).padStart(2, '0')}
              </div>
              <div 
                className="avatars-container"
                style={{
                  display: 'flex',
                  flexDirection: 'column', // Stack avatars vertically
                  alignItems: 'center',
                  gap: '4px', // Space between avatars
                  minHeight: '40px', // Ensure slot has some height even if empty
                }}
              >
                {activityByHour[hour]?.map(activity => (
                  <Tooltip key={`${hour}-${activity.login}`}>
                    <TooltipTrigger asChild>
                      <Avatar className="h-8 w-8 border-2 border-white shadow-sm">
                        <AvatarImage src={activity.avatarUrl || undefined} alt={activity.login} />
                        <AvatarFallback className="text-xs">
                          {activity.login.substring(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                    </TooltipTrigger>
                    <TooltipContent className="bg-gray-800 text-white p-2 rounded shadow-lg">
                      <p>{activity.login}</p>
                    </TooltipContent>
                  </Tooltip>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </TooltipProvider>
  );
};

export default ContributorActivityTimeline;
