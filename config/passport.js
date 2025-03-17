// const passport = require("passport");
// const LocalStrategy = require("passport-local").Strategy;
// const User = require("../models/User");

// passport.use(
//   new LocalStrategy({ usernameField: "email" }, async (email, password, done) => {
//     try {
//       const user = await User.findOne({ email });
//       if (!user) return done(null, false, { message: "User not found" });

//       const isMatch = await user.comparePassword(password);
//       if (!isMatch) return done(null, false, { message: "Incorrect password" });

//       return done(null, user);
//     } catch (err) {
//       return done(err);
//     }
//   })
// );

// passport.serializeUser((user, done) => done(null, user.id));
// passport.deserializeUser(async (id, done) => {
//   console.log("🔹 Deserializing User ID:", id);

//   if (!id) {
//     console.error("❌ No user ID in session!");
//     return done(null, false);
//   }

//   try {
//     const user = await User.findById(id);
//     if (!user) {
//       console.error("❌ User not found for ID:", id);
//       return done(null, false);
//     }
    
//     console.log("✅ User deserialized:", user.name);
//     done(null, user);
//   } catch (error) {
//     console.error("❌ Error in deserializing user:", error);
//     done(error, null);
//   }
// });


// module.exports = passport;
