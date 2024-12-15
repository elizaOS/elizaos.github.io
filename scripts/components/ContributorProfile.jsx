import React, { useState } from 'react';

const StatusDot = ({ status }) => {
  const colors = {
    open: 'bg-green-500',
    closed: 'bg-red-500',
    merged: 'bg-purple-500'
  };

  return (
    <span className={`inline-block w-2 h-2 rounded-full ${colors[status]} mr-2`} />
  );
};

const ActivitySection = ({ title, items = [], showStatus = false }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  
  const getStatus = (item) => {
    if (item.state === 'merged' || (item.state === 'closed' && title === 'Pull Requests')) {
      return 'merged';
    }
    return item.state || 'open';
  };

  return (
    <div className="border rounded-lg p-4">
      <div 
        className="flex items-center justify-between cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <h3 className="font-semibold">{title}</h3>
        <span>{isExpanded ? '▼' : '▶'}</span>
      </div>
      {isExpanded && (
        <div className="mt-4 space-y-2">
          {items.map((item, index) => (
            <div key={index} className="p-2 hover:bg-gray-50 dark:hover:bg-gray-800 rounded">
              <a
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm hover:text-blue-500 flex flex-col gap-1"
              >
                <span className="font-medium flex items-center">
                  {showStatus && <StatusDot status={getStatus(item)} />}
                  {item.message || item.title || item.body}
                </span>
                <span className="text-gray-500 text-xs">
                  {new Date(item.date || item.created_at).toLocaleDateString()}
                </span>
              </a>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const StatCard = ({ name, value }) => (
  <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow">
    <h3 className="font-semibold">{name}</h3>
    <p className="text-2xl font-bold">{value}</p>
  </div>
);

const ContributorProfile = ({ data }) => {
  const stats = [
    { name: 'Commits', value: data.activity.code.total_commits },
    { name: 'Pull Requests', value: data.activity.code.total_prs },
    { name: 'Issues', value: data.activity.issues.total_opened },
    { name: 'Comments', value: data.activity.engagement.total_comments }
  ];

  return (
    <div className="max-w-7xl mx-auto p-4 space-y-6">
      {/* Header with avatar and basic info */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <img
              src={data.avatar_url}
              alt={`${data.contributor}'s avatar`}
              className="w-16 h-16 rounded-full"
            />
            <div>
              <h1 className="text-2xl font-bold">{data.contributor}</h1>
              <div className="text-gray-600 dark:text-gray-400">
                <span className="font-semibold">Score: </span>
                {data.score}
              </div>
            </div>
          </div>
          <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">
            {data.score}
          </div>
        </div>
      </div>

      {/* Contribution Summary */}
      {data.summary && (
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow">
          <p className="text-gray-700 dark:text-gray-300 text-sm leading-relaxed">
            {data.summary}
          </p>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {stats.map(stat => (
          <StatCard key={stat.name} {...stat} />
        ))}
      </div>

      {/* Activity Sections */}
      <div className="space-y-4">
        <ActivitySection
          title="Commits"
          items={data.activity.code.commits}
        />
        <ActivitySection
          title="Pull Requests"
          items={data.activity.code.pull_requests}
          showStatus={true}
        />
        <ActivitySection
          title="Issues"
          items={data.activity.issues.opened || []}
          showStatus={true}
        />
        <ActivitySection
          title="Comments"
          items={data.activity.engagement.comments}
        />
      </div>
    </div>
  );
};

export default ContributorProfile;
