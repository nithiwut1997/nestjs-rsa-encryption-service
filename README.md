# NestJS RSA Encryption Service

A NestJS 11 service that encrypts payloads with hybrid RSA/AES encryption and exposes Swagger documentation at `/api-docs`.

## Requirements

- Node.js
- Yarn

## Install

```bash
yarn install
```

The requested runtime packages are included:

```bash
yarn add @nestjs/swagger swagger-ui-express @nestjs/config class-validator class-transformer
```

## RSA Key Setup

The repository does not contain RSA private or public key material. Generate your own local key pair before starting the application.

1. Visit https://cryptotools.net/rsagen
2. Generate an RSA key pair (2048 bits or higher)
3. Create:

```text
keys/
├── public.pem
└── private.pem
```

4. Save the generated public key to `keys/public.pem`
5. Save the generated private key to `keys/private.pem`
6. Copy `.env.example` to `.env`
7. Start the application

```bash
cp .env.example .env
yarn install
yarn start:dev
```

The application loads RSA keys from the file paths configured in `.env`:

```env
PORT=3000
RSA_PUBLIC_KEY_PATH=keys/public.pem
RSA_PRIVATE_KEY_PATH=keys/private.pem
```

## Run

```bash
yarn start:dev
```

Swagger UI is available at:

```text
http://localhost:3000/api-docs
```

## Encrypt

```bash
curl -X POST http://localhost:3000/get-encrypt-data \
  -H "Content-Type: application/json" \
  -d "{\"payload\":\"hello world\"}"
```

Response:

```json
{
  "successful": true,
  "error_code": "",
  "data": {
    "data1": "<encrypted-key>",
    "data2": "<iv>:<encrypted-payload>"
  }
}
```

## Decrypt

Use the `data` object returned by `/get-encrypt-data` as the decrypt request body. Do not send the full encrypt response envelope.

```bash
curl -X POST http://localhost:3000/get-decrypt-data \
  -H "Content-Type: application/json" \
  -d "{\"data1\":\"<encrypted-key>\",\"data2\":\"<iv>:<encrypted-payload>\"}"
```

Response:

```json
{
  "successful": true,
  "error_code": "",
  "data": {
    "payload": "hello world"
  }
}
```

## Error Format

All exceptions are normalized by the global exception filter:

```json
{
  "successful": false,
  "error_code": "<ERROR_CODE>",
  "data": null
}
```

## Test

```bash
yarn test
yarn test:cov
yarn test:e2e
```
