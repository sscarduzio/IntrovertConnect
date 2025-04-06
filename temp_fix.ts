                  <FormField
                    control={form.control}
                    name="contactId"
                    render={({ field }) => {
                      console.log("Contact field state:", field.value);
                      return (
                        <FormItem>
                          <FormLabel>Contact</FormLabel>
                          <Select 
                            onValueChange={(value) => {
                              console.log("Contact value changed to:", value);
                              field.onChange(parseInt(value));
                            }}
                            value={field.value?.toString() || ""}
                            defaultValue={field.value?.toString()}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select a contact" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {contacts && contacts.map((contact) => (
                                <SelectItem 
                                  key={contact.id} 
                                  value={contact.id.toString()}
                                >
                                  {contact.firstName} {contact.lastName}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormDescription>
                            The contact you'll be meeting with
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      );
                    }}
                  />