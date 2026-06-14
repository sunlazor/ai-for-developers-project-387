<?php

declare(strict_types=1);

namespace App\EventSubscriber;

use Symfony\Component\EventDispatcher\EventSubscriberInterface;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpKernel\Event\ExceptionEvent;
use Symfony\Component\HttpKernel\KernelEvents;

/**
 * Catch \RuntimeException (thrown by services) and convert to
 * JSON error responses matching the TypeSpec error shapes.
 */
class ApiExceptionSubscriber implements EventSubscriberInterface
{
    public function onKernelException(ExceptionEvent $event): void
    {
        $exception = $event->getThrowable();
        $request = $event->getRequest();

        // Only handle /api/* routes
        if (!str_starts_with($request->getPathInfo(), '/api')) {
            return;
        }

        if (!$exception instanceof \RuntimeException) {
            return;
        }

        $code = $exception->getCode();

        // Map PHP error codes to our domain codes
        $map = [
            401 => 'unauthorized',
            404 => 'not_found',
            409 => 'conflict',
            422 => 'unprocessable',
        ];

        $domainCode = $map[$code] ?? 'unprocessable';
        $statusCode = in_array($code, [401, 404, 409, 422], true) ? $code : 422;

        $event->setResponse(
            new JsonResponse(
                ['code' => $domainCode, 'message' => $exception->getMessage()],
                $statusCode,
            ),
        );
    }

    public static function getSubscribedEvents(): array
    {
        return [
            KernelEvents::EXCEPTION => ['onKernelException', 0],
        ];
    }
}
