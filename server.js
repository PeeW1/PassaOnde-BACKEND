import express  from 'express'
import mysql  from 'mysql2'
import dotenv from 'dotenv'
import bcrypt from 'bcrypt'
const saltRounds = 10;


dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
app.use(express.json());

const db = mysql.createConnection({
  host: process.env.HOST,
  user: process.env.USER,
  password: process.env.PASSWORD,
  database: process.env.DB_NAME,
}
);

db.connect((err) => {
  if (err) {
    console.error('Erro ao conectar ao banco de dados:', err);
    return;
  }
  console.log('Conectado ao banco de dados MySQL!');
});

const dbPromise = db.promise()


app.get('/motoristas', async (req, res) => {
  try {
    db.query('SELECT * FROM motoristas', (err, results) => {
      if (err) {
        console.error('Erro ao buscar motoristas:', err);
        res.status(500).json({ error: 'Erro ao buscar motoristas' });
        return;
      }
      res.json(results);
    });
  } catch (error) {
    console.error('Erro ao buscar motoristas:', error);
    res.status(500).json({ error: 'Erro ao buscar motoristas' });
  }
});

app.get('/escolas', async (req, res) => {
  try {
    db.query('SELECT * FROM escolas', (err, results) => {
      if (err) {
        console.error('Erro ao buscar escolas:', err);
        res.status(500).json({ error: 'Erro ao buscar escolas' });
        return;
      }
      res.json(results);
    });
  } catch (error) {
    console.error('Erro ao buscar escolas:', error);
    res.status(500).json({ error: 'Erro ao buscar escolas' });
  }
});

app.get('/turnos', async (req, res) => {
  try {
    db.query('SELECT * FROM turnos', (err, results) => {
      if (err) {
        console.error('Erro ao buscar turnos:', err);
        res.status(500).json({ error: 'Erro ao buscar turnos' });
        return;
      }
      res.json(results);
    });
  } catch (error) {
    console.error('Erro ao buscar turnos:', error);
    res.status(500).json({ error: 'Erro ao buscar turnos' });
  }
})

app.get('/linhas', async (req, res) => {
  try {
    const { escola, turno } = req.query;
    console.log('Escola:', escola, 'Turno:', turno);
    db.query(`SELECT me.motorista_id, m.nome FROM motorista_escola as me 
      JOIN motoristas as m ON me.motorista_id = m.id  
      WHERE  escola_id = ? AND turno = ?;`, 
      [escola, turno], (err, results) => {
      console.log('Resultados:', results);
      if (err) {
        console.error('Erro ao buscar linhas:', err);
        res.status(500).json({ error: 'Erro ao buscar linhas' });
        return;
      }
      res.json(results);
    });
  }catch (error) {
    console.error('Erro ao buscar linhas:', error);
    res.status(500).json({ error: 'Erro ao buscar linhas' });
  }
});

app.post('/cadastrar-motorista', async(req, res) => {
  const { nome, username, password, escolaManha, escolaMeiodia, escolaTarde, escolas } = req.body;
  console.log(nome, username, password, escolas)
  try {
      bcrypt.genSalt(saltRounds, function (err, salt) {
      if (err) {
        console.error('Erro ao gerar salt:', err);
        return res.status(500).json({ error: 'Erro ao gerar salt' });
      }

      bcrypt.hash(password, salt, function (err, hash) {
        if (err) {
          console.error('Erro ao gerar hash da senha:', err);
          return res.status(500).json({ error: 'Erro ao gerar hash da senha' });
        }
        db.query(
          'INSERT INTO motoristas (nome, usuario, senha) VALUES (?, ?, ?)',
          [nome, username, hash],
          (err, results) => {
            if (err) {
              console.error('Erro ao cadastrar motorista:', err);
              return res.status(500).json({ error: 'Erro ao cadastrar motorista' });
            }
            const motoristaId = results.insertId;
            escolas.forEach((escola) => {
              db.query(
                'INSERT INTO motorista_escola (motorista_id, escola_id, turno) VALUES (?, ?, ?)',
                [motoristaId, escola.id, escola.turno],
                (err) => {
                  if (err) {
                    console.error(`Erro ao cadastrar motorista na escola ${escola.nome} no turno ${escola.turno}:`, err);
                  }
                }
              ); 
            });
            res.status(201).json({ message: 'Motorista cadastrado com sucesso' });
          }
        );
      });
    });
}
catch (error) {
    console.error('Erro ao cadastrar motorista:', error);
    res.status(500).json({ error: 'Erro ao cadastrar motorista' });
  }
})

app.get('/buscar-linha', async (req, res) => {
  db.query('SELECT * FROM motorista_escola', (err, results) => {
    if (err) {
      console.error('Erro ao buscar linhas:', err);
      res.status(500).json({ error: 'Erro ao buscar linhas' });
      return;
    }
    res.json(results);
  })
})

app.post('/filter-name-school', async (req, res) => {
  const {linhaManha, linhaMeiodia, linhaTarde} = req.body;

  const schoolsIds = [
    ...linhaManha.map(item => { return item.escola_id, item.turno, console.log(item.escola_id, item.turno)}),
    ...linhaMeiodia.map(item => { return item.escola_id}),
    ...linhaTarde.map(item => { return item.escola_id})
  ]
  const placeholders = schoolsIds.map(() => '?').join(',');

  db.query(`SELECT escolas.nome, motorista_escola.turno FROM escolas JOIN motorista_escola ON escola_id = escolas.id WHERE escola_id IN (${placeholders})`, schoolsIds, (err, results) => {
    if (err) {
      console.error('Erro ao filtrar nome da escola:', err);
      res.status(500).json({ error: 'Erro ao filtrar nome da escola' });
      return;
    }
    res.json(results);
  })
});

app.get('/check-login', async (req, res) => {
  const { username, password } = req.query
  try{
    const [rows] = await dbPromise.query('SELECT * FROM motoristas WHERE usuario = ?', [username]);
 
    if (rows.length === 0 ) {
      return res.json({
        succes: false,
        message: 'Usuário não encontrado'
      })
    }

   const user = rows[0];
   const match = await bcrypt.compare(password, user.senha)
  
   if(!match) {
    return res.json({
      success: false,
      message: 'Senha incorreta'
    })
   }

    res.json({
            success: true,
            message: 'Login realizado com sucesso',
            id: user.id,
            nome: user.nome,
            usuario: user.usuario
    });

  }catch(error) {
    console.error(error);
    res.status(500).json({
      succes: false,
      message: "Erro no servidor"
    })
  }
})

app.listen(PORT, () => {
  console.log(`API rodando em http://localhost:${PORT}`);
});

