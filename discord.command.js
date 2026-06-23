// discord.command.js
const commands = [
    {
        name: 'addtask',
        description: 'Add a new task to TaskVault',
        options: [
            {
                name: 'question',
                description: 'The question text',
                type: 3, // Type 3 means it requires text input
                required: true
            },
            {
                name: 'answer',
                description: 'The answer text',
                type: 3, // Type 3 means it requires text input
                required: true
            }
        ]
    },
    {
        name: 'viewtask',
        description: 'View your active tasks',
    },
    {
        name: 'myperformance',
        description: 'Checks your overall performance metrics',
    },
    {
        name: 'stats',
        description: 'Check your database statistics',
    },
    {
        name: 'userstat',
        description: 'Check your subscription details and remaining access time.'
    },
    {
        name: 'userscore',
        description: 'View your completed task milestones and calculated balance.'
    }
];

module.exports = { commands };
