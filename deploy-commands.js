// deploy-commands.js
// Stores the structure of your Discord slash commands

const commands = [
    {
        name: 'addtask',
        description: 'Add a new task to TaskVault',
        options: [
            {
                name: 'task_name',
                description: 'The name or details of the task',
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
    }
];

module.exports = { commands };
