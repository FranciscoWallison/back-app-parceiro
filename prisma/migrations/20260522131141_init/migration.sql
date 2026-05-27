-- CreateEnum
CREATE TYPE "CorretoraStatus" AS ENUM ('APROVADA', 'PENDENTE', 'REJEITADA');

-- CreateTable
CREATE TABLE "corretoras" (
    "id" UUID NOT NULL,
    "cnpj" VARCHAR(14) NOT NULL,
    "cnpjFormatado" VARCHAR(18) NOT NULL,
    "razaoSocial" VARCHAR(200) NOT NULL,
    "nomeFantasia" VARCHAR(120) NOT NULL,
    "status" "CorretoraStatus" NOT NULL DEFAULT 'PENDENTE',
    "susep" VARCHAR(40) NOT NULL,
    "email" VARCHAR(160) NOT NULL,
    "telefone" VARCHAR(40) NOT NULL,
    "cidade" VARCHAR(120) NOT NULL,
    "uf" VARCHAR(2) NOT NULL,
    "dataCadastro" TIMESTAMP(3) NOT NULL,
    "dataAprovacao" TIMESTAMP(3),

    CONSTRAINT "corretoras_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "cpf" VARCHAR(11) NOT NULL,
    "nome" VARCHAR(160) NOT NULL,
    "email" VARCHAR(160) NOT NULL,
    "senhaHash" VARCHAR(120) NOT NULL,
    "corretoraId" UUID NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "biometric_credentials" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "deviceId" VARCHAR(128) NOT NULL,
    "deviceName" VARCHAR(120),
    "tokenHash" VARCHAR(120) NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ultimoUso" TIMESTAMP(3),

    CONSTRAINT "biometric_credentials_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "revoked_refresh_tokens" (
    "jti" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "revogadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiraEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "revoked_refresh_tokens_pkey" PRIMARY KEY ("jti")
);

-- CreateIndex
CREATE UNIQUE INDEX "corretoras_cnpj_key" ON "corretoras"("cnpj");

-- CreateIndex
CREATE UNIQUE INDEX "users_cpf_key" ON "users"("cpf");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_corretoraId_idx" ON "users"("corretoraId");

-- CreateIndex
CREATE INDEX "biometric_credentials_userId_idx" ON "biometric_credentials"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "biometric_credentials_userId_deviceId_key" ON "biometric_credentials"("userId", "deviceId");

-- CreateIndex
CREATE INDEX "revoked_refresh_tokens_expiraEm_idx" ON "revoked_refresh_tokens"("expiraEm");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_corretoraId_fkey" FOREIGN KEY ("corretoraId") REFERENCES "corretoras"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "biometric_credentials" ADD CONSTRAINT "biometric_credentials_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "revoked_refresh_tokens" ADD CONSTRAINT "revoked_refresh_tokens_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
