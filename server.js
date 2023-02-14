require('./config/db');

const app = require('express')();
const PORT = process.env.PORT || 5000;

//cors
const cors = require("cors");
app.use(cors());

const UserRouter = require('./api/User');

//accepting post form data
const bodyParser = require('express').json;
app.use(bodyParser());

app.use('/user', UserRouter);

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
