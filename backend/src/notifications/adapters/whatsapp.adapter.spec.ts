import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { WhatsAppAdapter } from './whatsapp.adapter';

describe('WhatsAppAdapter', () => {
  let adapter: WhatsAppAdapter;
  let configService: ConfigService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WhatsAppAdapter,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              if (key === 'WHATSAPP_PHONE_NUMBER_ID') return '1000123456789';
              if (key === 'WHATSAPP_ACCESS_TOKEN') return 'EAATestToken12345';
              if (key === 'WHATSAPP_API_VERSION') return 'v21.0';
              return null;
            }),
          },
        },
      ],
    }).compile();

    adapter = module.get<WhatsAppAdapter>(WhatsAppAdapter);
    configService = module.get<ConfigService>(ConfigService);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should fail honestly when credentials are not configured', async () => {
    jest.spyOn(configService, 'get').mockReturnValue(null);

    const result = await adapter.send({
      recipient: '9876543210',
      content: 'Hello patient',
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain("WhatsApp isn't connected yet");
  });

  it('should fail honestly and gracefully when recipient phone number is malformed', async () => {
    const result = await adapter.send({
      recipient: 'invalid_number_xyz',
      content: 'Hello patient',
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain('Invalid recipient phone number format');
  });

  it('should dispatch template message via Meta Cloud API endpoint with formatted payload', async () => {
    const mockFetch = jest.spyOn(global, 'fetch').mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        messaging_product: 'whatsapp',
        contacts: [{ input: '919876543210', wa_id: '919876543210' }],
        messages: [{ id: 'wamid.HBgLOTE5ODc2NTQzMjEwFQIAERgSRjQ1...' }],
      }),
    } as any);

    const result = await adapter.send({
      recipient: '9876543210',
      content: 'Welcome to Ewa Derma Clinic, Rahul Sharma! Your registration is confirmed. Patient ID: P-1001. For appointments, call +91 9120854977.',
      templateName: 'patient_registration_confirmation',
      templateLanguage: 'en',
      templateParameters: ['Rahul Sharma', 'P-1001'],
    });

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [callUrl, callOptions] = mockFetch.mock.calls[0];

    expect(callUrl).toBe('https://graph.facebook.com/v21.0/1000123456789/messages');
    expect(callOptions?.headers).toMatchObject({
      Authorization: 'Bearer EAATestToken12345',
      'Content-Type': 'application/json',
    });

    const body = JSON.parse(callOptions?.body as string);
    expect(body.messaging_product).toBe('whatsapp');
    expect(body.to).toBe('919876543210');
    expect(body.type).toBe('template');
    expect(body.template.name).toBe('patient_registration_confirmation');
    expect(body.template.language.code).toBe('en');
    expect(body.template.components[0].parameters).toEqual([
      { type: 'text', text: 'Rahul Sharma' },
      { type: 'text', text: 'P-1001' },
    ]);

    expect(result.success).toBe(true);
    expect(result.messageId).toBe('wamid.HBgLOTE5ODc2NTQzMjEwFQIAERgSRjQ1...');
  });

  it('should dispatch direct text message when no template is specified', async () => {
    const mockFetch = jest.spyOn(global, 'fetch').mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        messages: [{ id: 'wamid.text123' }],
      }),
    } as any);

    const result = await adapter.send({
      recipient: '+91 98765 43210',
      content: 'Direct notification message',
    });

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [, callOptions] = mockFetch.mock.calls[0];
    const body = JSON.parse(callOptions?.body as string);

    expect(body.type).toBe('text');
    expect(body.to).toBe('919876543210');
    expect(body.text.body).toBe('Direct notification message');
    expect(result.success).toBe(true);
    expect(result.messageId).toBe('wamid.text123');
  });

  it('should extract Meta Cloud API error detail when API returns 400 with error JSON', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValueOnce({
      ok: false,
      status: 400,
      statusText: 'Bad Request',
      json: async () => ({
        error: {
          message: 'Template does not exist in en language',
          type: 'OAuthException',
          code: 100,
          error_subcode: 2388040,
          error_data: {
            details: 'The template name patient_registration_confirmation does not exist',
          },
        },
      }),
    } as any);

    const result = await adapter.send({
      recipient: '9876543210',
      content: 'Some message',
      templateName: 'patient_registration_confirmation',
      templateParameters: ['Rahul Sharma', 'P-1001'],
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain('Meta WhatsApp API Error (#100:2388040)');
    expect(result.error).toContain('Template does not exist in en language');
    expect(result.error).toContain('The template name patient_registration_confirmation does not exist');
  });

  it('should catch network transport exceptions gracefully without throwing', async () => {
    jest.spyOn(global, 'fetch').mockRejectedValueOnce(new Error('Connection refused to graph.facebook.com'));

    const result = await adapter.send({
      recipient: '9876543210',
      content: 'Some message',
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain('Connection refused to graph.facebook.com');
  });
});
