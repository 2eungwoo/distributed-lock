### Distributed-Lock
> Simple NestJS source code to test and verify the behavior of a distributed-lock in multi-instance environtment
> This simple project demonstrates a simple yet effective way to handle concurrency issues in a distributed system

### Project Overview
> -   **Multi-Instance Server**: Deploys three separate server instances (`app1`, `app2`, `app3`) using Docker to simulate a real-world distributed environment.
> -   **Redis Distributed Lock**: Implements a distributed lock using a single Redis instance to ensure data consistency when multiple servers attempt to modify a shared resource simultaneously.
> -   **Core Logic**: The application exposes a simple API to deduct the `stock` of a `product` entity by one. This operation is protected by the distributed lock to prevent race conditions.
> -   **Result Testing**: Utilizes `k6` to perform load testing on the stock deduction API, verifying that the distributed lock correctly prevents concurrency problems and ensures the stock is deducted accurately.

### How to Run
> 1. **Start the Docker Environment**
>  - To build and run `three apps`, `redis`, `postgresql`, execute the following command:
> ```shell
> docker-compose up --build -d
> ```
>
> 2. **Run the k6 Load Test**
> - Simulating concurrent requests to the stock deduction with k6 script
> ```shell
> k6 run k6/load-test.js
> # <!> need to check if {productId} is valid before you run this k6 script
> ```

### How to Verify
> You can verify the behavior of the distributed lock and the stock deduction process through the CLI.

> **1. Set Initial Test Data**
> - Before running the load-test.js, initializing the product data is required.
> ```shell
> curl -X POST http://localhost:3000/product/reset
> # it clears the product table and creates a new product with 1000 stock
> ```

> **2. View Application Logs**
> - To see the logs from all thress app instacnes ii real-tiem, use the following command:
> ```shell
> docker-compose logs -f app1 app2 app3
> ```

> **3. Monitor Redis Commands**
> - To see the commands being exceuted on Redis serevr, including the Lua scripts for acquiring/releaseing locks:
> ```shell
> docker-compose exec redis redis-cli monitor
> # you will see `EVAL` with `[lua]` commands, which are the Lua scripts used by Redlock
> ```

> **4. Check Stock Result**
> - To directly query the `product` table in the PostgreSQL and check the final stock result count after a test:
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
>
> or http request
> ```shell
> curl -X GET http://localhost:3000/product/{prodjctId}
> ```

### etc
> updated 2025-11-08
