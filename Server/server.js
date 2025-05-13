const express = require('express');
const bodyParser = require('body-parser');
const pool = require('./db'); 
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const secret = "my_test_token";

const app = express();


app.use(cors());

app.use(cors({
    origin: 'https://minionkevin.github.io/Game-2048/' 
  }));


app.use(bodyParser.json());


app.post('/signup', async (req, res) => {
  const { username, password } = req.body;  // 获取请求体中的用户名和密码

  // 输入验证
  if (!username || !password) {
    return res.status(400).json({ message: 'Username and password are required' });
  }

  try {
    // 查询数据库，检查用户名是否已存在
    const result = await pool.query('SELECT * FROM users WHERE username = $1', [username]);

    if (result.rows.length > 0) {
      return res.status(400).json({ message: 'Username already exists' });
    }
// maybe?
//    const hashedPassword = await bcrypt.hash(password, 10);
    const insertResult = await pool.query('INSERT INTO users (username, password) VALUES ($1, $2) RETURNING *', [username, password]);

    const user = insertResult.rows[0];
    const token = jwt.sign({ userId: user.id, username: user.username }, secret, { expiresIn: '1h' });
    
    res.status(201).json({
      message: 'User registered successfully',
      user,
      username: user.username,
      token,
      userId: user.id
    });
  } catch (error) {
    console.error('Error inserting user:', error);
    res.status(500).json({ message: 'Server error' });
  }
});


app.post('/login', async (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ message: 'Please provide both username and password.' });
    }

    try {
        const result = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
        if (result.rows.length === 0) {
            return res.status(401).json({ message: 'Invalid username or password.' });
        }

        const user = result.rows[0];
        // const isMatch = await bcrypt.compare(password, user.password);
        const isMatch = password === user.password;

        if (!isMatch) {
            return res.status(402).json({ message: 'Invalid username or password.' });
        }

        const token = jwt.sign({ userId: user.id, username: user.username }, secret, { expiresIn: '1h' });
        res.status(200).json({ message: 'Login successful', token, username: user.username,playerId:user.id });
        
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

app.post('/update-score',async(req,res)=>{
    const {username,score} = req.body;

    try{
        const result = await pool.query('SELECT highest_score FROM users WHERE username = $1',[username]);
        if(result.rows.length ==0)
        {
            return res.status(401).json({message:'User not found, Please login'});
        }

        const currHigh = result.rows[0].highest_score;
        if(score>currHigh)
        {
            await pool.query('UPDATE users SET highest_score = $1 WHERE username = $2', [score, username]);
        }
        res.json({ message: 'Score updated successfully' });
    } catch (error) {
        console.error('Error updating score:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

app.get('/leaderboard', async (req, res) => {
    const token = req.headers.authorization?.split(' ')[1]; // Bearer <token>
    try {
      const topTenResult = await pool.query(
        'SELECT username, highest_score FROM users ORDER BY highest_score DESC LIMIT 10'
      );
  
      let currentUser = null;
  
      if (token) {
        const decoded = jwt.verify(token, secret);
        const userResult = await pool.query(
          'SELECT username, highest_score FROM users WHERE id = $1',
          [decoded.userId]
        );
        currentUser = userResult.rows[0];
      }
  
      res.json({ topTen: topTenResult.rows, currentUser });
    } catch (err) {
      console.error('Error fetching leaderboard:', err);
      res.status(500).json({ message: 'Server error' });
    }
  });

app.get('/guest-leaderboard', async (req, res) => {
    try {
      const topTenResult = await pool.query(
        'SELECT username, highest_score FROM users ORDER BY highest_score DESC LIMIT 10'
      );

      res.json({ topTen: topTenResult.rows });
    } catch (err) {
      console.error('Error fetching leaderboard:', err);
      res.status(500).json({ message: 'Server error' });
    }
  });

  app.post('/player-state', async (req, res) => {

    const { playerId, info } = req.body;

    if (!playerId || !info) {
      return res.status(400).json({ message: 'Missing playerId or info' });
    }
  
    try {
      await pool.query(
        `
        INSERT INTO player_state (player_id, info)
        VALUES ($1, $2)
        ON CONFLICT (player_id)
        DO UPDATE SET info = $2, updated_at = NOW()
        `,
        [playerId, info]
      );
  
      res.status(200).json({ message: 'Player state updated successfully' });
    } catch (error) {
      console.error('Error saving player state:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });

  app.get('/player-state/:playerId', async (req, res) => {
    const { playerId } = req.params;
  
    try {
      const result = await pool.query(
        'SELECT info, updated_at FROM player_state WHERE player_id = $1',
        [playerId]
      );
  
      if (result.rows.length === 0) {
        return res.status(404).json({ message: 'Player state not found' });
      }
  
      res.status(200).json(result.rows[0]);
    } catch (error) {
      console.error('Error fetching player state:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });


app.post('/verify-token', (req, res) => {
    const token = req.body.token;
    if (!token) {
      return res.status(400).json({ message: 'No token provided' });
    }
  
    try {
      const decoded = jwt.verify(token, secret);
      res.json({ valid: true, username: decoded.username });
    } catch (err) {
      res.status(401).json({ message: 'Invalid token' });
    }
  });

// 启动服务器
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});