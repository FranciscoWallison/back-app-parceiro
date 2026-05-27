-- CreateEnum
CREATE TYPE "TipoPlano" AS ENUM ('ODONTO', 'SAUDE');

-- CreateEnum
CREATE TYPE "TipoProposta" AS ENUM ('PF', 'PME');

-- CreateEnum
CREATE TYPE "StatusProposta" AS ENUM ('RASCUNHO', 'SIMULADA', 'AGUARDANDO_DOCS', 'AGUARDANDO_ASSINATURA', 'AGUARDANDO_PAGAMENTO', 'TRANSMITIDA', 'APROVADA', 'RECUSADA', 'CANCELADA');

-- CreateEnum
CREATE TYPE "TipoDocumento" AS ENUM ('RG', 'CNH', 'COMPROVANTE_RESIDENCIA', 'CONTRATO_SOCIAL', 'CARTAO_CNPJ', 'OUTRO');

-- CreateEnum
CREATE TYPE "MetodoPagamento" AS ENUM ('PIX', 'BOLETO');

-- CreateEnum
CREATE TYPE "StatusPagamento" AS ENUM ('AGUARDANDO', 'PAGO', 'EXPIRADO', 'CANCELADO');

-- CreateEnum
CREATE TYPE "TipoMaterial" AS ENUM ('PDF', 'IMAGEM', 'VIDEO', 'LINK');

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "telefone" VARCHAR(40);

-- CreateTable
CREATE TABLE "password_reset_tokens" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "token" VARCHAR(64) NOT NULL,
    "expiraEm" TIMESTAMP(3) NOT NULL,
    "usadoEm" TIMESTAMP(3),
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "password_reset_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "planos" (
    "id" UUID NOT NULL,
    "codigo" VARCHAR(40) NOT NULL,
    "nome" VARCHAR(120) NOT NULL,
    "tipo" "TipoPlano" NOT NULL DEFAULT 'ODONTO',
    "descricao" VARCHAR(500) NOT NULL,
    "valorTitularCents" INTEGER NOT NULL,
    "valorDependenteCents" INTEGER NOT NULL,
    "carenciaMeses" INTEGER NOT NULL DEFAULT 0,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "planos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "propostas" (
    "id" UUID NOT NULL,
    "numero" SERIAL NOT NULL,
    "tipo" "TipoProposta" NOT NULL,
    "status" "StatusProposta" NOT NULL DEFAULT 'RASCUNHO',
    "corretorId" UUID NOT NULL,
    "planoId" UUID NOT NULL,
    "valorTotalCents" INTEGER NOT NULL DEFAULT 0,
    "observacoes" VARCHAR(1000),
    "criadaEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadaEm" TIMESTAMP(3) NOT NULL,
    "simuladaEm" TIMESTAMP(3),
    "transmitidaEm" TIMESTAMP(3),
    "aprovadaEm" TIMESTAMP(3),
    "recusadaEm" TIMESTAMP(3),
    "motivoRecusa" VARCHAR(500),

    CONSTRAINT "propostas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "titulares" (
    "id" UUID NOT NULL,
    "propostaId" UUID NOT NULL,
    "cpf" VARCHAR(11) NOT NULL,
    "nome" VARCHAR(160) NOT NULL,
    "dataNascimento" TIMESTAMP(3) NOT NULL,
    "email" VARCHAR(160) NOT NULL,
    "telefone" VARCHAR(40) NOT NULL,
    "cep" VARCHAR(8) NOT NULL,
    "logradouro" VARCHAR(200) NOT NULL,
    "numero" VARCHAR(20) NOT NULL,
    "complemento" VARCHAR(80),
    "bairro" VARCHAR(120) NOT NULL,
    "cidade" VARCHAR(120) NOT NULL,
    "uf" VARCHAR(2) NOT NULL,
    "declaracaoSaude" JSONB,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "titulares_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dependentes" (
    "id" UUID NOT NULL,
    "titularId" UUID NOT NULL,
    "cpf" VARCHAR(11) NOT NULL,
    "nome" VARCHAR(160) NOT NULL,
    "dataNascimento" TIMESTAMP(3) NOT NULL,
    "parentesco" VARCHAR(40) NOT NULL,
    "declaracaoSaude" JSONB,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "dependentes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "empresas" (
    "id" UUID NOT NULL,
    "propostaId" UUID NOT NULL,
    "cnpj" VARCHAR(14) NOT NULL,
    "razaoSocial" VARCHAR(200) NOT NULL,
    "nomeFantasia" VARCHAR(120) NOT NULL,
    "emailContato" VARCHAR(160) NOT NULL,
    "telefone" VARCHAR(40) NOT NULL,
    "cep" VARCHAR(8) NOT NULL,
    "logradouro" VARCHAR(200) NOT NULL,
    "numero" VARCHAR(20) NOT NULL,
    "complemento" VARCHAR(80),
    "bairro" VARCHAR(120) NOT NULL,
    "cidade" VARCHAR(120) NOT NULL,
    "uf" VARCHAR(2) NOT NULL,

    CONSTRAINT "empresas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "documentos_proposta" (
    "id" UUID NOT NULL,
    "propostaId" UUID NOT NULL,
    "tipo" "TipoDocumento" NOT NULL,
    "nomeArquivo" VARCHAR(200) NOT NULL,
    "urlMock" VARCHAR(400) NOT NULL,
    "tamanhoBytes" INTEGER NOT NULL DEFAULT 0,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "documentos_proposta_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pagamentos" (
    "id" UUID NOT NULL,
    "propostaId" UUID NOT NULL,
    "metodo" "MetodoPagamento" NOT NULL,
    "valorCents" INTEGER NOT NULL,
    "status" "StatusPagamento" NOT NULL DEFAULT 'AGUARDANDO',
    "qrCodeMock" VARCHAR(2000),
    "copiaColaMock" VARCHAR(500),
    "linhaDigitavel" VARCHAR(80),
    "vencimento" TIMESTAMP(3),
    "pagoEm" TIMESTAMP(3),
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pagamentos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assinaturas" (
    "id" UUID NOT NULL,
    "propostaId" UUID NOT NULL,
    "hash" VARCHAR(120) NOT NULL,
    "assinadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ipMock" VARCHAR(45),

    CONSTRAINT "assinaturas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "materiais_promocionais" (
    "id" UUID NOT NULL,
    "titulo" VARCHAR(160) NOT NULL,
    "descricao" VARCHAR(500) NOT NULL,
    "tipo" "TipoMaterial" NOT NULL DEFAULT 'PDF',
    "urlMock" VARCHAR(400) NOT NULL,
    "thumbnail" VARCHAR(400),
    "ordem" INTEGER NOT NULL DEFAULT 0,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "materiais_promocionais_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mensagens_contato" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "assunto" VARCHAR(160) NOT NULL,
    "mensagem" VARCHAR(2000) NOT NULL,
    "respondida" BOOLEAN NOT NULL DEFAULT false,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mensagens_contato_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "faq_items" (
    "id" UUID NOT NULL,
    "pergunta" VARCHAR(300) NOT NULL,
    "resposta" VARCHAR(2000) NOT NULL,
    "categoria" VARCHAR(80) NOT NULL,
    "ordem" INTEGER NOT NULL DEFAULT 0,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "faq_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "password_reset_tokens_token_key" ON "password_reset_tokens"("token");

-- CreateIndex
CREATE INDEX "password_reset_tokens_userId_idx" ON "password_reset_tokens"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "planos_codigo_key" ON "planos"("codigo");

-- CreateIndex
CREATE UNIQUE INDEX "propostas_numero_key" ON "propostas"("numero");

-- CreateIndex
CREATE INDEX "propostas_corretorId_idx" ON "propostas"("corretorId");

-- CreateIndex
CREATE INDEX "propostas_status_idx" ON "propostas"("status");

-- CreateIndex
CREATE INDEX "titulares_propostaId_idx" ON "titulares"("propostaId");

-- CreateIndex
CREATE INDEX "dependentes_titularId_idx" ON "dependentes"("titularId");

-- CreateIndex
CREATE UNIQUE INDEX "empresas_propostaId_key" ON "empresas"("propostaId");

-- CreateIndex
CREATE INDEX "documentos_proposta_propostaId_idx" ON "documentos_proposta"("propostaId");

-- CreateIndex
CREATE INDEX "pagamentos_propostaId_idx" ON "pagamentos"("propostaId");

-- CreateIndex
CREATE UNIQUE INDEX "assinaturas_propostaId_key" ON "assinaturas"("propostaId");

-- CreateIndex
CREATE INDEX "mensagens_contato_userId_idx" ON "mensagens_contato"("userId");

-- CreateIndex
CREATE INDEX "faq_items_categoria_ordem_idx" ON "faq_items"("categoria", "ordem");

-- AddForeignKey
ALTER TABLE "password_reset_tokens" ADD CONSTRAINT "password_reset_tokens_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "propostas" ADD CONSTRAINT "propostas_corretorId_fkey" FOREIGN KEY ("corretorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "propostas" ADD CONSTRAINT "propostas_planoId_fkey" FOREIGN KEY ("planoId") REFERENCES "planos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "titulares" ADD CONSTRAINT "titulares_propostaId_fkey" FOREIGN KEY ("propostaId") REFERENCES "propostas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dependentes" ADD CONSTRAINT "dependentes_titularId_fkey" FOREIGN KEY ("titularId") REFERENCES "titulares"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "empresas" ADD CONSTRAINT "empresas_propostaId_fkey" FOREIGN KEY ("propostaId") REFERENCES "propostas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documentos_proposta" ADD CONSTRAINT "documentos_proposta_propostaId_fkey" FOREIGN KEY ("propostaId") REFERENCES "propostas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pagamentos" ADD CONSTRAINT "pagamentos_propostaId_fkey" FOREIGN KEY ("propostaId") REFERENCES "propostas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assinaturas" ADD CONSTRAINT "assinaturas_propostaId_fkey" FOREIGN KEY ("propostaId") REFERENCES "propostas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mensagens_contato" ADD CONSTRAINT "mensagens_contato_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
