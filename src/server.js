const config = require('./config');
const { createApp } = require('./createApp');

createApp().listen(config.PORT, () => {
  console.log(`Server is running on port:${config.PORT}`);
});