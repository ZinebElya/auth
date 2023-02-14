const express = require('express');
const router = express.Router();

//env variables
require('dotenv').config();


//mongodb user model 
const User = require('./../models/User');


/*//mongodb user Verification model 
const UserVerification = require('./../models/UserVerification');*/

//email handler
const nodemailer = require ('nodemailer');

//unique string 
const{v4: uuidv4} = require ('uuid');
//const myUUID = uuidv4();

//mongodb passwordRest model 
const PasswordReset = require('./../models/PasswordReset');
const { result } = require('lodash');

// password handler
const bcrypt = require ('bcrypt');

/*//nodemailer stuff
let transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: process.env.AUTH_EMAIL,
        pass: process.env.AUTH_PASS,
    }
})

//testing success
transporter.verify((error, success) =>{
    if (error){
        console.log(error);
    } else {
        console.log("Ready for messages"); // tjrs message d'erreur
        console.log(success);
    }
})*/

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
    let {email, password} = req.body;
    email = email.trim();
    password = password.trim();

    if (email == "" || password == ""){
        res.json({
            status: "FAILED",
            message: "Empty identifiers supplied"
        });
    } else{
        //check if user exist
        User.find({email})
        .then(data =>{
            if (data.length) {
                //user exists

                const hashedPassword = data[0].password;
                bcrypt.compare(password, hashedPassword).then(result =>{
                    if(result){
                        //password match
                        res.json({
                            status: "SUCCESS",
                            message: "Signup successful",
                            data: data 
                        })
                    } else {
                        res.json({
                            status: "FAILED",
                            message: "Invalid password"
                        })
                    }
                })
                .catch(err => {
                    res.json({
                        status: "FAILED",
                        message: "An error occurred while comparing passwords!"
                    })
                })
            } else {
                res.json({
                    status: "FAILED",
                    message: "Invalid identifiers !"
                })
            }
        })
        .catch(err => {
            res.json({
                status: "FAILED",
                message: "An error occurred while checking for existing user!"
            })
        })
    }

})

//Password reset stuff
router.post("/requestPasswordReset",(req, res) =>{
    const {email, redirectUrl} = req.body;

    //check if email exists
    User.find({email})
    .then((data) => {
        if(data.length){
            //user exists

            //check if user is verified
            if (!data[0].verified){   // peut etre à corriger cette partie du if 
                res.json({
                    status: "FAILED",
                    message: "Email hasn't been verified yet. Check your inbox."
                })
            } else{
                // proceed with email to reset password
                sendResetEmail(data[0], redirectUrl, res);
            }
        } else{
            res.json({
                status: "FAILED",
                message: "No account with the supplied email"
            })
        }
    })
    .catch(error => {
        console.log(error);
        res.json({
            status: "FAILED",
            message: "An error occurred while checking for existing user!"
        })
    })
})

//send password reset email
const sendResetEmail = ({_id, email}, redirectUrl, res) => {
    const resetString = uuidv4() + _id;

    //First, we clear all existing reset records
    PasswordReset
      .deleteMany({userId: _id})
      .then(result => {
        //reset records deleted successfuly
        // now we send the mail

        //mail options
        const mailOptions = {
            from: process.env.AUTH_EMAIL,
            to: email,
            subject: "Password Reset",
            html:'<p>The link expires in 60 minutes.</p><p> Press <a href= ${redirectUrl + '/' + _id + '/' + resetString} here to reset password</p>',
        };

        // hash the reset string
        const saltRounds = 10;
        bcrypt
          .hash(resetString, saltRounds)
          .then(hashedResetString =>{
            //set values in password reset collection
            const newPasswordReset = new PasswordReset ({
                userId : _id,
                resetString: hashedResetString,
                createdAt: Date.now(),
                expiresAt: Date.now(3600000),
            });

            newPasswordReset
              .save()
              .then(() =>{
                transporter
                  .sendMail(mailOptions)
                  .then(() =>{
                    //reset email sent and password reset record saved
                    res.json({
                        status: "PENDING",
                        message: "Password reset email sent",
                    })
                  })
                  .catch(error => {
                    console.log(error)
                    res.json({
                        status: "FAILED",
                        message: "Password reset email failed",
                    })
                  })
              })
              .catch(error => {
                console.log(error)
                res.json({
                    status: "FAILED",
                    message: "Couldn't save password reset"
                })
              })
          .catch(error => {
            //error while clearing existing records
            console.log(error)
            res.json({
                status: "FAILED",
                message: "Clearing existing password reset records failed"
            })
        })
    })
    .catch(error => {
        //error while clearing existing records
        console.log(error)
        res.json({
            status: "FAILED",
            message: "Clearing existing password reset records failed"
        })
    })
  })
}

// actually reset password
router.post("/resetPassword", (req,res) => {
    let {userId, resetString, newPassword} = req.body;

    PasswordReset
      .find({userId})
      .then(result => {
        if(result.length > 0){
            //password reset record exists so we proceed

            const {expiresAt} = result[0];
            const hashedResetString = result[0].resetString;


            //checking for expired reset string 
            if (expiresAt < Date.now()){
                PasswordReset
                  .deleteOne({userId})
                  .then(() => {
                    //reset record deleted successfully
                    res.json({
                        status: "FAILED",
                        message: "Password reset link has expired."
                    })
                  })
                  .catch(error => {
                    //deletion failed
                    res.json({
                        status: "FAILED",
                        message: "Clearing password reset records failed"
                    })
                  })
            } else {
                // valid reset record exists so we validate the reset string
                //first compare the hashed reset string 
                bcrypt
                  .compare(resetString, hashedResetString)
                  .then((result) => {
                    if(result){
                        //strings matched
                        //hash password again
                        const saltRounds = 10;
                        bcrypt
                          .hash(newPassword, saltRounds)
                          .then(hashedNewPassword => {
                            //update user password

                            User
                              .updateOne({_id: userId}, {password: hashedNewPassword})
                              .then(() => {
                                // update completed
                                // now delete reset record
                                PasswordReset
                                  .deleteOne({userId})
                                  .then(() => {
                                    // both user record and reset record updated
                                    res.json({
                                        status: "SUCCESS",
                                        message: "Password has been reset successfully."
                                    })
                                  })
                                  .catch (error =>{
                                    console.log(error);
                                    res.json({
                                        status: "FAILED",
                                        message: "An error occurred while finalizing password reset."
                                    })

                                  })

                              })
                              .catch(error => {
                                console.log(error);
                                res.json({
                                    status: "FAILED",
                                    message: "Updating user password failed."
                                })

                              })
                          })
                          .catch(error => {
                            console.log(error);
                            res.json({
                                status: "FAILED",
                                message: "An error occurred while hashing new password."
                            })
                          })
                    }else{
                        //existing record but incorrect reset string passed
                        res.json({
                            status: "FAILED",
                            message: "Invalid password reset details passed."
                        })
                    }
                  })
                  .catch(error => {
                    res.json({
                        status: "FAILED",
                        message: "Comparing password reset strings failed"
                    })
                  })
            }


        } else{
            //password reset record doesn't exist
            res.json({
                status: "FAILED",
                message: "Password reset request not found"
            })

        }
      })
      .catch()
})

module.exports = router;