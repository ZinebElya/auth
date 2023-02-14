const express = require('express');
const router = express.Router();

//mongodb user model 
const User = require('./../models/User');

//password handler
const bcrypt = require ('bcrypt');

//Signup
router.post('/signup',(req, res)=>{
    let {name, email, password} = req.body;
    name = name.trim();
    email = email.trim();
    password = password.trim();

    if (name == "" || email == "" || password == ""){
        res.json({
            status: "FAILED",
            message: "Empty input fields!"
        });
    } else if(!/^[a-zA-Z ]*$/.test(name)){
        res.json({
            status: "FAILED",
            message: "Invalid name!"
        })
    } else if(!/^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/.test(email)){
        res.json({
            status: "FAILED",
            message: "Invalid email!"
        })
    } else if(password.length < 8){
        res.json({
            status: "FAILED",
            message: "Password is too short!"
        })
    } else {
        //checking if user already exists
        User.find({email})
        .then(result =>{
            if (result.lenght){
                // A user already exists
                res.json({
                    status: "FAILED",
                    message: "User with the provided email already exists!"
                })
            } else {
                // Try to create new user

                //password handling
                const saltRounds = 10;
                bcrypt.hash(password, saltRounds).then(hashedPassword =>{
                    const newUser = new User ({
                        name, 
                        email, 
                        password: hashedPassword,
                    });

                    newUser.save().then(result => {
                        res.json({
                            status: "SUCCESS",
                            message: "Signup successful",
                            data: result, 
                        })
                    })
                    .catch(err =>{
                        res.json({
                            status: "FAILED",
                            message: "An error occurred while saving user account!"
                        })
                    })
                })
                .catch(err => {
                    res.json({
                        status: "FAILED",
                        message: "An error occurred while hashing password!"
                    })
                })
            }
        })
        .catch(err => {
            console.log(err);
            res.json({
                status: "FAILED",
                message: "An error occurred while checking for existing user!"
            })
        })
    }
})

//Signin
router.post('/signin',(req, res)=>{

})

module.exports = router;