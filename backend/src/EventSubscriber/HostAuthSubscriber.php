<?php

declare(strict_types=1);

namespace App\EventSubscriber;

use Symfony\Component\EventDispatcher\EventSubscriberInterface;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpKernel\Event\RequestEvent;
use Symfony\Component\HttpKernel\KernelEvents;

class HostAuthSubscriber implements EventSubscriberInterface
{
    private string $token;

    public function __construct()
    {
        $this->token = $_SERVER['HOST_API_TOKEN'] ?? $_ENV['HOST_API_TOKEN'] ?? '';
    }

    public function onKernelRequest(RequestEvent $event): void
    {
        if (!$event->isMainRequest()) {
            return;
        }

        $request = $event->getRequest();
        $path = $request->getPathInfo();

        if (!str_starts_with($path, '/api/host')) {
            return;
        }

        $authHeader = $request->headers->get('Authorization', '');

        if (!str_starts_with($authHeader, 'Bearer ')) {
            $event->setResponse(
                new JsonResponse(
                    ['code' => 'unauthorized', 'message' => 'Missing or malformed Authorization header.'],
                    401,
                ),
            );
            return;
        }

        $providedToken = substr($authHeader, 7);

        if (!hash_equals($this->token, $providedToken)) {
            $event->setResponse(
                new JsonResponse(
                    ['code' => 'unauthorized', 'message' => 'Invalid Bearer token.'],
                    401,
                ),
            );
        }
    }

    public static function getSubscribedEvents(): array
    {
        return [
            KernelEvents::REQUEST => ['onKernelRequest', 10],
        ];
    }
}
