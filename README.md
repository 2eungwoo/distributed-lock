### Distributed Lock Test with Redis and NestJS
> A NestJS project to test and verify the behavior of a distributed lock in a multi-instance environment using Docker and Redis.

### Project Overview
> This project demonstrates a simple yet effective way to handle concurrency issues in a distributed system. It explores the following concepts:
> -   **Multi-Instance Architecture**: Deploys three separate server instances (`app1`, `app2`, `app3`) using Docker to simulate a real-world distributed environment.
> -   **Distributed Lock with Redis**: Implements a distributed lock using a single Redis instance to ensure data consistency when multiple servers attempt to modify a shared resource simultaneously.
> -   **Core Logic**: The application exposes a simple API to deduct the `stock` of a `product` entity by one. This operation is protected by the distributed lock to prevent race conditions.
> -   **Concurrency Testing**: Utilizes `k6` to perform load testing on the stock deduction API, verifying that the distributed lock correctly prevents concurrency problems and ensures the stock is deducted accurately.

### How to Run
> 1. **Start the Docker Environment**
> To build and run the three application servers and the Redis instance, execute the following command:
> ```shell
> docker-compose up --build -d
> ```
>
> 2. **Run the k6 Load Test**
> Once the containers are running, you can simulate concurrent requests to the stock deduction endpoint using the k6 script.
> ```shell
> k6 run k6/load-test.js
> // <!> need to check if {productId} is valid before you run this k6 script
> ```

### How to Verify
> You can verify the behavior of the distributed lock and the stock deduction process through the CLI.

> **1. Set Initial Test Data**
> Before running the load test, initialize the product data. The following `curl` command calls the reset API, which clears the product table and creates a new product with 1000 stock.
> ```shell
> curl -X POST http://localhost:3000/product/reset
> ```

> **2. View Application Logs**
> To see the logs from all three application instances in real-time, which shows which server is processing requests, use the following command:
> ```shell
> docker-compose logs -f app1 app2 app3
> ```

> **3. Monitor Redis Commands**
> To see the commands being executed on the Redis server, including the Lua scripts for acquiring and releasing locks, run:
> ```shell
> docker-compose exec redis redis-cli monitor
> ```
> You will see `EVAL` wieh `[lua]` commands, which are the Lua scripts used by Redlock.

> **4. Check Database State**
> To directly query the `product` table in the PostgreSQL database and check the final stock count after a test, follow these steps:
>
> Connect to the database container:
> ```shell
> docker-compose exec -it postgres psql -U user -d test
> ```
>
> Once inside the `psql` shell, run the query:
> ```sql
> SELECT * FROM product;
> ```
> To exit the `psql` shell, type `\q`.

### etc
> updated 2025-11-08