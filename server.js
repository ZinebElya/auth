require('./config/db');

const app = require('express')();
const port = 1337;

const UserRouter = require('./api/User');

//accepting post form data
const bodyParser = require('express').json;
app.use(bodyParser());
app.use('/user', UserRouter);

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
  });
