let commands;
try {
  commands = require('jjinppang/commands');
} catch {
  commands = require('../../commands.js');
}

module.exports = {
  commands,
};
