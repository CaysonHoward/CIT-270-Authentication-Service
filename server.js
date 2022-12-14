const express = require('express');
const bodyParser = require('body-parser');
const https = require('https');
const fs = require('fs')
const {v4: uuidv4} = require('uuid');
const port = 443
const app = express();
const {createClient} = require('redis');
const md5 = require('md5');
const redisClient = createClient(
    {
    url:`redis://default:${process.env.REDIS_PASS}@redis-stedi-cayson:6379`
    }
);

app.use(bodyParser.json());

app.use(express.static("public"))


https.createServer({

    key: fs.readFileSync('./ssl/server.key'),
    cert: fs.readFileSync('./ssl/server.crt'),
    ca: fs.readFileSync('./ssl/chain.pem'),
    // passphrase: 'P@ssw0rd'

}, app).listen(port, async () => {
    try{
        await redisClient.connect();
        console.log('Listening...')}
    catch(error){
        console.log(error);
    }
});

// app.listen(port, async ()=> {
//     await redisClient.connect();
//     console.log('listening on port '+port);
// });

app.get('/', (req,res)=>{
    res.send('Hello World!')
});

app.use(express.static('public'));

app.post('/user', (req , res) => {
    const newUserRequestObject = req.body;
    console.log('New User:',JSON.stringify(newUserRequestObject));
    const hashPassword = md5(req.body.password);
    newUserRequestObject.password = hashPassword;
    newUserRequestObject.verifyPassword = hashPassword;
    redisClient.hSet('users', req.body.email,JSON.stringify(newUserRequestObject));
    res.send('New user created');
});

app.post("/login", async (req , res) =>{
    const loginEmail = req.body.userName;
    console.log(JSON.stringify(req.body));
    console.log('loginEmail', loginEmail);
    const loginPassword = md5(req.body.password);
    console.log("loginPassword", loginPassword);
    // res.send("Who are you!?")

    const userString=await redisClient.hGet('users',loginEmail);
    const userObject=JSON.parse(userString);

    if(userString=='' || userString ==null){
        res.status(404);
        res.send('User not found');
    }
    else if (loginEmail == userObject.userName && loginPassword == userObject.password){
        const token = uuidv4();
        res.send(token);
    }
    else{
        res.status(401);//unauthorized
        res.send("Invalid user or password");
    }
});
