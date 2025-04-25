'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { zodResolver } from '@hookform/resolvers/zod';
import { signIn } from 'next-auth/react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

const loginSchema = z.object({
  username: z.string().min(1, 'Användarnamn krävs'),
  password: z.string().min(1, 'Lösenord krävs'),
});

export default function Login() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: '',
      password: '',
    },
  });

  async function onSubmit(data: z.infer<typeof loginSchema>) {
    try {
      setIsLoading(true);
      
      const result = await signIn('credentials', {
        redirect: false,
        username: data.username,
        password: data.password,
      });

      if (result?.error) {
        toast.error('Fel användarnamn eller lösenord');
        return;
      }

      toast.success('Inloggningen lyckades');
      router.push('/dashboard');
      router.refresh();
    } catch (error) {
      toast.error('Ett fel inträffade vid inloggningen');
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Glasmästarappen</h1>
          <div className="flex justify-center mb-6">
            <div className="relative w-20 h-20">
              <Image 
                src="/window.svg" 
                alt="Glasmästarappen" 
                fill
                className="object-contain"
              />
            </div>
          </div>
        </div>
        
        <Card>
          <CardHeader>
            <CardTitle>Logga in</CardTitle>
            <CardDescription>
              Ange dina inloggningsuppgifter för att fortsätta.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="username"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Användarnamn</FormLabel>
                      <FormControl>
                        <Input placeholder="Ditt användarnamn" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Lösenord</FormLabel>
                      <FormControl>
                        <Input type="password" placeholder="Ditt lösenord" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? 'Loggar in...' : 'Logga in'}
                </Button>
              </form>
            </Form>
            
            <div className="mt-6 text-sm text-center text-gray-500">
              <p>Testanvändare för utveckling:</p>
              <div className="grid grid-cols-3 gap-4 mt-2 text-xs">
                <div>
                  <strong>Admin:</strong><br />
                  admin / password
                </div>
                <div>
                  <strong>Arbetsledare:</strong><br />
                  arbetsledare / password
                </div>
                <div>
                  <strong>Tekniker:</strong><br />
                  tekniker / password
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}