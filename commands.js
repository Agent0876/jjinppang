const commands = require('./packages/cli/dist/commands/index.js');
module.exports = commands.default || commands.commands || commands;
