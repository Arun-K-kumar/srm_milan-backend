const express = require('express');
const helmet = require('helmet');
const cors = require('cors');


function createApp(){
    const app = express();
    app.use(helmet());
    app.use(cors());
    app.use(express.json());

    app.get('/', (req, res) =>{
        res.json({name: "SRM Milan Backend"});
    });
    return app;
}

module.exports ={createApp};
