const jwt = require('jsonwebtoken');

const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY3Y2U3Y2NjMDI5NGEyMWJiODQwZmI1MyIsInJvbGUiOiJhZG1pbiIsIm5hbWUiOiJSb2xhbmQgT3J0aXoiLCJpYXQiOjE3NDM0ODMwNTYsImV4cCI6MTc0NDA4Nzg1Nn0.PHnP5cCQYosqdFfJ0nAnmvfpWOELL3zlM3k517eJHRc';

try {
  const decoded = jwt.decode(token);
  console.log("Decoded Token:", decoded);
} catch (err) {
  console.error("Error decoding token:", err);
}