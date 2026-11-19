# Makaria

App pessoal de planejamento financeiro.

## Recursos
- login e cadastro com Supabase
- dashboard com saldo, receitas, despesas, investimentos e metas
- salário bruto, adiantamento, INSS e descontos configuráveis
- cálculo de líquido, adiantamento e restante
- lançamentos por categoria e conta
- metas financeiras
- contas bancárias
- cartão com limite, utilização e parcelamentos
- categorias com limites mensais e alertas por faixa
- contas recorrentes
- análise financeira
- PIN local, bloqueio e modo escuro
- backup JSON
- PWA para Android

## Supabase
O arquivo `supabase.sql` é uma migração segura com `create table if not exists` e políticas por usuário. Execute-o no SQL Editor do projeto.

Nunca coloque uma chave `sb_secret_...` no frontend.
