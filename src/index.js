const express = require("express");
const res = require("express/lib/response");
const app = express();
const { v4: uuidv4 } = require("uuid");

//prepara a aplicação para receber via body o tipo json
//Middleware
app.use(express.json());

const customers = [];

function verifyCustomerExistsCPF(request, response, next)
{
    const { cpf } = request.headers;
    
    const customer = customers.find(c => c.cpf === cpf);
    if (!customer)
    {
        response.status(400).json({error: "Não encontrado!"});
    }
    
    request.customer = customer;
    return next();
}

function getBalance(statement)
{
    const balance = statement.reduce((acc, op) => {
                        if (op.type === 'credit')
                        {
                            return acc + op.amount;
                        }
                        else
                        {
                            return acc - op.amount;
                        }
                    }, 0);

    return balance;
}

app.post("/account", (request, response) => {
    const { cpf, name, lastname } = request.body;
    const customerExists = customers.some((customer) => customer.cpf === cpf);
    if (customerExists)
    {
        return response.status(400).json({error: "Usuário existente!"});
    }

    customers.push({
        cpf,
        name,
        lastname,
        id: uuidv4(), 
        statement: [] 
    });
    
    return response.status(201).send();
});

app.get("/statement", verifyCustomerExistsCPF, (request, response) => {

    const { customer } = request;
    return response.json(customer.statement);
});

app.post("/deposit", verifyCustomerExistsCPF, (request, response) => {
    const { description, amount } = request.body;
    const { customer } = request;

    const statementOperation = {
        description, 
        amount, 
        create_at: new Date(),
        type: 'credit'
    };

    customer.statement.push(statementOperation);

    return response.status(201).send();
});

app.post("/withdraw", verifyCustomerExistsCPF, (request, response) => {
    const { amount } = request.body;
    const { customer } = request;
    
    const  balance = getBalance(customer.statement);
    
    if (balance < amount)
    {
        return response.status(400).json({error: "Saldo insuficiente!"});
    }

    const statementOperation = { 
        amount, 
        create_at: new Date(),
        type: 'debit'
    };
    customer.statement.push(statementOperation);

    return response.status(201).send();
});


app.get("/statement/date", verifyCustomerExistsCPF, (request, response) => {
    const { customer } = request;
    const { date } = request.query;
    const dateFormat = new Date(date + " 00:00");

    const statement = customer.statement.filter(s => 
        s.create_at.toDateString() === new Date(dateFormat).toDateString()
    );

    return response.status(201).json(statement);
});


app.put("/account", verifyCustomerExistsCPF, (request, response) => {
    const { customer } = request;
    const { name, lastname } = request.body;
    
    customer.name = name;
    customer.lastname = lastname;

    return response.status(201).send();
});

app.get("/account", verifyCustomerExistsCPF, (request,  response) => {
    const { customer } = request;
    return response.status(201).json(customer);
});

app.delete("/account", verifyCustomerExistsCPF, (request, response) =>{
    const { customer } = request;
    customers.splice(customers.indexOf(customer), 1);
    return response.status(200).json(customers);
});

app.listen(3333);