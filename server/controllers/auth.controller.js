// server/controllers/auth.controller.js
                  const jwt = require('jsonwebtoken');
                  const User = require('../models/User'); // Changed from '../models/User'
                  const config = require('../config/config');

                  // Generate JWT
                  const generateToken = (userId) => {
                    return jwt.sign({ userId }, config.jwtSecret, { expiresIn: '1d' });
                  };

                  // Register a new user
                  exports.register = async (req, res) => {
                    try {
                      const { name, email, password, role, department } = req.body;

                      // Check if user already exists
                      let user = await User.findOne({ email });
                      if (user) {
                        return res.status(400).json({ message: 'User already exists' });
                      }

                      // Generate employee ID
                      const latestUser = await User.findOne().sort({ createdAt: -1 });
                      const employeeIdNum = latestUser ? parseInt(latestUser.employeeId.slice(3)) + 1 : 1;
                      const employeeId = `EMP${employeeIdNum.toString().padStart(3, '0')}`;

                      // Create new user
                      user = new User({
                        name,
                        email,
                        password,
                        role: role || 'employee',
                        employeeId,
                        department
                      });

                      await user.save();

                      // Generate token
                      const token = generateToken(user._id);

                      res.status(201).json({
                        token,
                        user: {
                          id: user._id,
                          name: user.name,
                          email: user.email,
                          role: user.role,
                          employeeId: user.employeeId,
                          department: user.department
                        }
                      });
                    } catch (error) {
                      console.error('Registration error:', error);
                      res.status(500).json({ message: 'Server error' });
                    }
                  };

                  // Login user
                  // controllers/auth.controller.js (login handler)
                  exports.login = async (req, res) => {
                    try {
                      const { email, password } = req.body;
                      if (!email || !password) {
                        return res.status(400).json({ message: 'Email and password are required' });
                      }

                      // IMPORTANT: +password because in the schema password has select:false
                      const user = await User.findOne({ email }).select('+password');
                      if (!user) {
                        return res.status(401).json({ message: 'Invalid credentials' });
                      }

                      // Compare entered password with stored hashed password
                      const isMatch = await user.comparePassword(password);
                      if (!isMatch) {
                        return res.status(401).json({ message: 'Invalid credentials' });
                      }

                      // Generate token (your generateToken function)
                      const token = generateToken(user._id);

                      // hide password before sending response
                      const userObj = user.toObject();
                      delete userObj.password;

                      res.json({ user: userObj, token });
                    } catch (error) {
                      console.error('Login error:', error);
                      res.status(500).json({ message: 'Server error' });
                    }
                  };


                  // Get current user
                  exports.getMe = async (req, res) => {
                    try {
                      // req.user is set in the auth middleware
                      res.json({
                        user: {
                          id: req.user._id,
                          name: req.user.name,
                          email: req.user.email,
                          role: req.user.role,
                          employeeId: req.user.employeeId,
                          department: req.user.department
                        }
                      });
                    } catch (error) {
                      console.error('Get me error:', error);
                      res.status(500).json({ message: 'Server error' });
                    }
                  };