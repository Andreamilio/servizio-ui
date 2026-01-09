import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { readSession, validateSessionUser } from "@/app/lib/session";
import { getUser } from "@/app/lib/userStore";
import { AppLayout } from "@/app/components/layouts/AppLayout";
import { Card, CardBody, CardHeader } from "@/app/components/ui/Card";
import { Button } from "@/app/components/ui/Button";
import { MessageCircle, Ticket, AlertCircle } from "lucide-react";
import { Box, VStack, HStack, Heading, Text } from "@chakra-ui/react";
import { Alert } from "@/app/components/ui/Alert";

type SP = Record<string, string | string[] | undefined>;

function pick(sp: SP, key: string) {
    const v = sp[key];
    return typeof v === 'string' ? v : Array.isArray(v) ? v[0] : undefined;
}

export default async function HostSupportPage({ 
    searchParams 
}: { 
    searchParams?: SP | Promise<SP> 
}) {
    const sp = ((await Promise.resolve(searchParams as any)) ?? {}) as SP;
    const clientId = pick(sp, 'client')?.trim() || '';
    const aptId = pick(sp, 'apt')?.trim() || '';

    const cookieStore = await cookies();
    const sess = cookieStore.get("sess")?.value;
    const me = validateSessionUser(readSession(sess));

    if (!me || me.role !== "host") {
        redirect("/?err=session_expired");
        return (
            <Box p={6} color="var(--text-primary)">
                Non autorizzato
            </Box>
        );
    }

    const hostUser = me.userId ? getUser(me.userId) : null;

    return (
        <AppLayout 
            role="host"
            userInfo={hostUser ? {
                userId: hostUser.userId,
                username: hostUser.username,
                profileImageUrl: hostUser.profileImageUrl,
            } : undefined}
        >
            <Box mx="auto" w="100%" maxW="2xl" p={{ base: 4, sm: 6, lg: 8 }}>
                <Card variant="elevated">
                    <CardHeader>
                        <Heading as="h1" size="xl" fontWeight="semibold" color="var(--text-primary)">
                            Supporto
                        </Heading>
                        <Text fontSize="sm" color="var(--text-secondary)">
                            Questa è una versione mock: nel prodotto reale qui apri un ticket o chatti con supporto.
                        </Text>
                    </CardHeader>
                    <CardBody>
                        <VStack spacing={4} align="stretch">
                            <VStack spacing={3} align="stretch">
                                <Button variant="secondary" size="lg" fullWidth leftIcon={<MessageCircle size={24} />}>
                                    Apri chat (mock)
                                </Button>
                                <Button variant="secondary" size="lg" fullWidth leftIcon={<Ticket size={24} />}>
                                    Apri ticket (mock)
                                </Button>
                            </VStack>

                            <Alert variant="warning">
                                <HStack spacing={3} align="start">
                                    <Box flexShrink={0} mt="2px">
                                        <AlertCircle size={20} color="var(--warning-text-icon)" />
                                    </Box>
                                    <VStack align="stretch" spacing={1}>
                                        <Text fontWeight="semibold" fontSize="sm" color="var(--warning-text)">
                                            Emergenza
                                        </Text>
                                        <Text fontSize="sm" color="var(--text-primary)">
                                            Nel prototipo non chiami nessuno. Nel reale: numeri/istruzioni.
                                        </Text>
                                    </VStack>
                                </HStack>
                            </Alert>
                        </VStack>
                    </CardBody>
                </Card>
            </Box>
        </AppLayout>
    );
}
