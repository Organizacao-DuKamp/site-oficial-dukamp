import { ChevronLeft, ChevronRight, FilePlus2, MessageCircle, Search, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export type SellerClient = {
  id: string;
  full_name: string | null;
  contact_email: string | null;
  email: string | null;
  phone: string | null;
  municipio_propriedade: string | null;
  uf: string | null;
  chat_ticket_id?: string | null;
  customer_code?: string | null;
  seller_code?: string | null;
  seller_name?: string | null;
};

type Props = {
  clients: SellerClient[];
  search: string;
  onSearchChange: (value: string) => void;
  page: number;
  pageCount: number;
  onPageChange: (page: number) => void;
  showActions?: boolean;
};

export function SellerClientList({
  clients,
  search,
  onSearchChange,
  page,
  pageCount,
  onPageChange,
  showActions = true,
}: Props) {
  return (
    <div className="space-y-4">
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          className="pl-9"
          placeholder="Buscar por nome, código, e-mail, telefone ou cidade"
          aria-label="Buscar clientes"
        />
      </div>

      {clients.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 py-12 text-center">
            <Users className="h-9 w-9 text-muted-foreground" />
            <p className="font-medium">
              {search ? "Nenhum cliente encontrado" : "Nenhum cliente associado"}
            </p>
            <p className="text-sm text-muted-foreground">
              {search
                ? "Tente buscar por outro termo."
                : showActions
                  ? "Os clientes que escolherem você como vendedor aparecerão aqui."
                  : "Nenhum cliente do ERP está associado ao código deste vendedor."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {clients.map((client) => {
            const email = client.contact_email || client.email;
            const location = [client.municipio_propriedade, client.uf].filter(Boolean).join(" / ");
            return (
              <Card key={client.id}>
                <CardContent className="flex flex-col justify-between gap-4 p-4 sm:flex-row sm:items-center">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate font-semibold">
                        {client.full_name || "Cliente sem nome informado"}
                      </p>
                      {client.customer_code && (
                        <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                          Código {client.customer_code}
                        </span>
                      )}
                    </div>
                    <div className="mt-1 space-y-0.5 text-sm text-muted-foreground">
                      {email && <p className="truncate">{email}</p>}
                      {client.phone && <p>{client.phone}</p>}
                      {location && <p>{location}</p>}
                    </div>
                  </div>
                  {showActions && (
                    <div className="flex shrink-0 flex-wrap gap-2">
                      {client.chat_ticket_id ? (
                        <Button variant="outline" size="sm" asChild>
                          <a href={`/vendedor/chat?ticket=${encodeURIComponent(client.chat_ticket_id)}`}>
                            <MessageCircle className="h-4 w-4" /> Abrir chat
                          </a>
                        </Button>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          disabled
                          title="O chat aparecerá quando o cliente enviar a primeira mensagem."
                        >
                          <MessageCircle className="h-4 w-4" /> Aguardando mensagem
                        </Button>
                      )}
                      <Button size="sm" asChild>
                        <a href={`/vendedor/orcamentos/novo?cliente=${encodeURIComponent(client.id)}`}>
                          <FilePlus2 className="h-4 w-4" /> Criar orçamento
                        </a>
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {pageCount > 1 && (
        <div className="flex items-center justify-between gap-3" aria-label="Paginação de clientes">
          <p className="text-sm text-muted-foreground">
            Página {page} de {pageCount}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page === 1}
              onClick={() => onPageChange(page - 1)}
            >
              <ChevronLeft className="h-4 w-4" /> Anterior
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page === pageCount}
              onClick={() => onPageChange(page + 1)}
            >
              Próxima <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
