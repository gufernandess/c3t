import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { AppError } from './app-error.js';

export function registerGlobalErrorHandler(app: FastifyInstance): void {
  app.setErrorHandler((error: Error, request: FastifyRequest, reply: FastifyReply) => {
    if (error instanceof AppError) {
      request.log.warn(
        {
          code: error.code,
          details: error.details,
        },
        error.message,
      );

      return reply.status(error.statusCode).send({
        statusCode: error.statusCode,
        code: error.code,
        error: 'Request Error',
        message: error.message,
      });
    }

    if ('validation' in error) {
      return reply.status(400).send({
        statusCode: 400,
        code: 'VALIDATION_ERROR',
        error: 'Request Error',
        message: 'Parâmetros inválidos. Revise os dados enviados e tente novamente.',
      });
    }

    request.log.error(error);

    return reply.status(500).send({
      statusCode: 500,
      code: 'INTERNAL_SERVER_ERROR',
      error: 'Internal Server Error',
      message: 'Ocorreu um erro interno ao processar a requisição.',
    });
  });
}
